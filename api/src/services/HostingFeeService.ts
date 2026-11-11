import { PrismaClient, Rarity, NotificationType } from '@prisma/client';
import { Redis } from 'ioredis';
import { config, activeHostingRates, inactiveHostingRates } from '../config.js';
import { calculateDivorceRefund } from '../utils/rarityCalculator.js';
import { NotificationService } from './NotificationService.js';
import { DivorceService } from './DivorceService.js';

export interface DailyFeeSummary {
  date: string;
  totalUsersEvaluated: number;
  activeUsersCharged: number;
  inactiveUsersCharged: number;
  totalZinthosCollected: number;
  totalWaifusConfiscated: number;
  dryRun: boolean;
}

export class HostingFeeService {
  constructor(
    private prisma: PrismaClient,
    private redis?: Redis,
    private notificationService?: NotificationService,
    private divorceService?: DivorceService
  ) {}

  /**
   * Executa a cobrança diária de taxa de hospedagem para todos os jogadores com harém.
   * Suporta dryRun para simulações e force para ignorar trava de execução do dia.
   */
  async runDailyFee(options: { dryRun?: boolean; force?: boolean } = {}): Promise<DailyFeeSummary> {
    const { dryRun = false, force = false } = options;
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const lockKey = `hosting:fee:lock:${dateStr}`;

    // Proteção de idempotência com Redis (a menos que force = true)
    if (this.redis && !dryRun && !force) {
      const alreadyRun = await this.redis.get(lockKey);
      if (alreadyRun) {
        throw new Error(`A taxa diária de hospedagem para a data ${dateStr} já foi executada.`);
      }
    }

    const graceMs = config.HOSTING_GRACE_HOURS * 3600 * 1000;
    const confiscoRatio = (config.HOSTING_CONFISCO_PERMILLE || 3000) / 10000; // 0.30

    // 1. Buscar todos os usuários que possuem waifus no harém
    const usersWithHarem = await this.prisma.user.findMany({
      where: {
        harem: { some: {} },
      },
      select: {
        id: true,
        name: true,
        kakera: true,
        lastActiveAt: true,
        updatedAt: true,
        harem: {
          select: {
            id: true,
            characterId: true,
            keys: true,
            claimedAt: true,
            character: {
              select: {
                id: true,
                name: true,
                baseRarity: true,
              },
            },
          },
          orderBy: [
            { character: { baseRarity: 'asc' } },
            { claimedAt: 'asc' },
          ],
        },
      },
    });

    let activeUsersCharged = 0;
    let inactiveUsersCharged = 0;
    let totalZinthosCollected = 0;
    let totalWaifusConfiscated = 0;

    for (const user of usersWithHarem) {
      // Determina status de atividade
      const lastActiveTime = user.lastActiveAt
        ? new Date(user.lastActiveAt).getTime()
        : new Date(user.updatedAt).getTime();
      const isInactive = now.getTime() - lastActiveTime > graceMs;

      const rates = isInactive ? inactiveHostingRates : activeHostingRates;

      // Agrupa contagem e custo por raridade
      const countByRarity: Record<Rarity, number> = {
        COMMON: 0,
        UNCOMMON: 0,
        RARE: 0,
        EPIC: 0,
        LEGENDARY: 0,
      };

      for (const entry of user.harem) {
        countByRarity[entry.character.baseRarity]++;
      }

      const costCommon = countByRarity.COMMON * rates.COMMON;
      const costUncommon = countByRarity.UNCOMMON * rates.UNCOMMON;
      const costRare = countByRarity.RARE * rates.RARE;
      const costEpic = countByRarity.EPIC * rates.EPIC;
      const costLegendary = countByRarity.LEGENDARY * rates.LEGENDARY;

      const totalFee = costCommon + costUncommon + costRare + costEpic + costLegendary;
      if (totalFee <= 0) continue;

      if (isInactive) inactiveUsersCharged++;
      else activeUsersCharged++;

      if (dryRun) {
        totalZinthosCollected += Math.min(user.kakera, totalFee);
        continue;
      }

      // 2. Executar Débito e Confisco Atômico
      await this.prisma.$transaction(async (tx) => {
        let currentBalance = user.kakera;
        let shortfall = totalFee - currentBalance;

        if (shortfall <= 0) {
          // Saldo é suficiente para cobrir 100% da taxa
          const newBalance = currentBalance - totalFee;
          await tx.user.update({
            where: { id: user.id },
            data: { kakera: newBalance },
          });

          await tx.kakeraTransaction.create({
            data: {
              userId: user.id,
              amount: -totalFee,
              reason: 'HOSTING_FEE',
              metadata: {
                isInactive,
                ratesUsed: rates,
                counts: countByRarity,
                costs: { costCommon, costUncommon, costRare, costEpic, costLegendary },
                totalFee,
                waifusCount: user.harem.length,
              },
            },
          });

          totalZinthosCollected += totalFee;
          currentBalance = newBalance;
        } else {
          // Saldo insuficiente: zera o saldo e quita o saldo devedor através de confisco
          await tx.user.update({
            where: { id: user.id },
            data: { kakera: 0 },
          });

          if (currentBalance > 0) {
            await tx.kakeraTransaction.create({
              data: {
                userId: user.id,
                amount: -currentBalance,
                reason: 'HOSTING_FEE',
                metadata: {
                  isInactive,
                  partialDeduction: true,
                  totalFeeOriginal: totalFee,
                  shortfall,
                },
              },
            });
            totalZinthosCollected += currentBalance;
          }

          let remainingDebt = shortfall;
          const confiscatedList: Array<{ id: string; name: string; rarity: string; recoveredValue: number }> = [];

          // Ordenar waifus: da menos valiosa para a mais valiosa
          const rarityPriority: Record<Rarity, number> = {
            COMMON: 1,
            UNCOMMON: 2,
            RARE: 3,
            EPIC: 4,
            LEGENDARY: 5,
          };

          const sortedHarem = [...user.harem].sort((a, b) => {
            const pA = rarityPriority[a.character.baseRarity];
            const pB = rarityPriority[b.character.baseRarity];
            if (pA !== pB) return pA - pB;
            return new Date(a.claimedAt).getTime() - new Date(b.claimedAt).getTime();
          });

          for (const entry of sortedHarem) {
            if (remainingDebt <= 0) break;

            // Valor de 100% do divórcio integral sem soft limit diário
            const refund = calculateDivorceRefund(entry.character.baseRarity, entry.keys, { dailyDivorceRate: 1.0 });
            const recoveredValue = Math.max(1, Math.floor(refund.fullNetKakera * confiscoRatio));

            // Remove do harém e desassocia soulmate
            await tx.haremEntry.delete({ where: { id: entry.id } });
            await tx.soulmate.deleteMany({ where: { userId: user.id, characterId: entry.characterId } });

            // Decrementa o claimCount com segurança
            await tx.$executeRaw`
              UPDATE characters
              SET "claimCount" = GREATEST(0, "claimCount" - 1)
              WHERE id = ${entry.characterId}
            `;

            remainingDebt -= recoveredValue;
            confiscatedList.push({
              id: entry.character.id,
              name: entry.character.name,
              rarity: entry.character.baseRarity,
              recoveredValue,
            });

            totalWaifusConfiscated++;

            await tx.kakeraTransaction.create({
              data: {
                userId: user.id,
                amount: recoveredValue,
                reason: 'HOSTING_FEE_WAIFU',
                metadata: {
                  characterId: entry.character.id,
                  characterName: entry.character.name,
                  rarity: entry.character.baseRarity,
                  fullNetKakera: refund.fullNetKakera,
                  confiscoRatio,
                  recoveredValue,
                  debtBefore: remainingDebt + recoveredValue,
                  debtAfter: remainingDebt,
                },
              },
            });
          }

          // Se o confisco rendeu mais do que a dívida (remainingDebt < 0), a sobra vai para o saldo do jogador
          if (remainingDebt < 0) {
            const surplus = Math.abs(remainingDebt);
            await tx.user.update({
              where: { id: user.id },
              data: { kakera: surplus },
            });
            currentBalance = surplus;
          } else {
            currentBalance = 0;
          }
        }

        // 3. Notificar o jogador sobre a taxa e demonstrativo
        if (this.notificationService) {
          const breakdownLines = [
            countByRarity.COMMON > 0 ? `• ${countByRarity.COMMON}x Comum (${costCommon}z)` : null,
            countByRarity.UNCOMMON > 0 ? `• ${countByRarity.UNCOMMON}x Incomum (${costUncommon}z)` : null,
            countByRarity.RARE > 0 ? `• ${countByRarity.RARE}x Raro (${costRare}z)` : null,
            countByRarity.EPIC > 0 ? `• ${countByRarity.EPIC}x Épico (${costEpic}z)` : null,
            countByRarity.LEGENDARY > 0 ? `• ${countByRarity.LEGENDARY}x Lendário (${costLegendary}z)` : null,
          ].filter(Boolean).join(' | ');

          const title = isInactive
            ? `⚠️ Taxa de Inatividade: -${totalFee} Zinthos`
            : `🏠 Taxa de Hospedagem: -${totalFee} Zinthos`;

          const statusMsg = isInactive
            ? `Você está inativo há mais de ${config.HOSTING_GRACE_HOURS}h.`
            : `Hospedagem diária do seu harém (${user.harem.length} waifus).`;

          const message = `${statusMsg} Total debitado: ${totalFee} Zinthos.\nDemonstrativo: ${breakdownLines}\nSaldo atual: ${currentBalance} Zinthos.`;

          await this.notificationService.createNotification({
            userId: user.id,
            type: 'SYSTEM',
            title,
            message,
            metadata: {
              totalFee,
              isInactive,
              breakdown: countByRarity,
              costs: { costCommon, costUncommon, costRare, costEpic, costLegendary },
              newBalance: currentBalance,
            },
          });
        }
      });
    }

    // Grava trava de execução no Redis por 23 horas
    if (this.redis && !dryRun) {
      await this.redis.set(lockKey, '1', 'EX', 23 * 3600);
    }

    return {
      date: dateStr,
      totalUsersEvaluated: usersWithHarem.length,
      activeUsersCharged,
      inactiveUsersCharged,
      totalZinthosCollected,
      totalWaifusConfiscated,
      dryRun,
    };
  }
}
