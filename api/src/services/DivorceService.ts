import { PrismaClient } from '@prisma/client';
import { calculateDivorceRefund } from '../utils/rarityCalculator.js';
import { config } from '../config.js';
import { MarketInvestmentService, BASE_MONEY_SUPPLY, INFLATION_ALPHA } from './MarketInvestmentService.js';

export class DivorceService {
  constructor(
    private prisma: PrismaClient,
    private marketInvestmentService?: MarketInvestmentService
  ) {}

  private async getInflationMultiplier(): Promise<number> {
    if (this.marketInvestmentService) {
      try {
        const stats = await this.marketInvestmentService.getMacroStats();
        return stats.inflationMultiplier || 1.0;
      } catch {
        // Fallback para cálculo direto se o serviço falhar
      }
    }

    try {
      const kakeraSumResult = await this.prisma.user.aggregate({
        _sum: { kakera: true },
        where: { id: { not: 'test_web_user_1' } },
      });
      const circulatingKakera = kakeraSumResult._sum.kakera ?? BASE_MONEY_SUPPLY;
      const ratioMoney = Math.max(1, circulatingKakera / BASE_MONEY_SUPPLY);
      return Number((1 + INFLATION_ALPHA * Math.log(ratioMoney)).toFixed(4));
    } catch {
      return 1.0;
    }
  }

  async divorce(userId: string, characterId: string) {
    // 1. Localizar o personagem (flexível)
    let haremEntry = await this.prisma.haremEntry.findFirst({
      where: {
        userId,
        OR: [
          { characterId },
          { character: { id: characterId.toLowerCase().trim() } },
          { character: { name: { equals: characterId.trim(), mode: 'insensitive' } } },
        ],
      },
      include: {
        character: true,
      },
    });

    if (!haremEntry) {
      return {
        success: false,
        error: {
          code: 'CHARACTER_NOT_IN_HAREM',
          message: 'Você não possui este personagem no seu harém.',
        },
      };
    }

    const { character, keys } = haremEntry;

    // 2. Verificar se o personagem é Soulmate (10+ chaves ou na tabela soulmates)
    const soulmateRecord = await this.prisma.soulmate.findUnique({
      where: {
        userId_characterId: {
          userId,
          characterId: character.id,
        },
      },
    });

    const isSoulmate = keys >= (config.SOULMATE_KEYS_REQUIRED ?? 10) || Boolean(soulmateRecord);
    const inflationMultiplier = await this.getInflationMultiplier();

    // 3. Calcular reembolso de Kakera com penalidade de 5% e multiplicador de inflação
    const refund = calculateDivorceRefund(character.baseRarity, keys, {
      isSoulmate,
      inflationMultiplier,
    });

    // 4. Executar transação atômica
    const result = await this.prisma.$transaction(async (tx) => {
      // Remove do harém
      await tx.haremEntry.delete({
        where: { id: haremEntry.id },
      });

      // Remove de soulmate se existir vínculo
      if (soulmateRecord) {
        await tx.soulmate.delete({
          where: { id: soulmateRecord.id },
        });
      }

      // Decrementa claimCount de forma segura evitando valores negativos
      await tx.$executeRaw`
        UPDATE characters
        SET "claimCount" = GREATEST(0, "claimCount" - 1)
        WHERE id = ${character.id}
      `;

      // Credita Kakera ao usuário
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          kakera: { increment: refund.netKakera },
        },
      });

      // Registra no extrato
      await tx.kakeraTransaction.create({
        data: {
          userId,
          amount: refund.netKakera,
          reason: 'DIVORCE',
          metadata: {
            characterId: character.id,
            characterName: character.name,
            rarity: character.baseRarity,
            keysAccumulated: keys,
            rawValue: refund.rawValue,
            rawBeforeInflation: refund.rawBeforeInflation,
            inflationMultiplier,
            penaltyRate: '5%',
            isSoulmate,
          },
        },
      });

      return updatedUser;
    });

    return {
      success: true,
      data: {
        message: isSoulmate
          ? `💖 Divórcio Dourado! Você se separou de ${character.name} (Soulmate). Recebeu ${refund.netKakera} ${config.CURRENCY_NAME} ${config.CURRENCY_EMOJI}! 💔`
          : `Você se divorciou de ${character.name}. Recebeu ${refund.netKakera} ${config.CURRENCY_NAME} ${config.CURRENCY_EMOJI}! 💔`,
        refundedKakera: refund.netKakera,
        keysLost: keys - refund.remainingKeys,
        newKakeraBalance: result.kakera,
        isSoulmate,
        inflationMultiplier,
        character: {
          id: character.id,
          name: character.name,
          rarity: character.baseRarity,
        },
      },
    };
  }

  async forceDivorce(userId: string, characterId: string) {
    const haremEntry = await this.prisma.haremEntry.findFirst({
      where: {
        userId,
        OR: [
          { characterId },
          { character: { id: characterId.toLowerCase().trim() } },
          { character: { name: { equals: characterId.trim(), mode: 'insensitive' } } },
        ],
      },
    });

    if (!haremEntry) {
      return {
        success: false,
        error: {
          code: 'CHARACTER_NOT_IN_HAREM',
          message: `Personagem ${characterId} não está no harém de ${userId}.`,
        },
      };
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.haremEntry.delete({
        where: { id: haremEntry.id },
      });

      await tx.soulmate.deleteMany({
        where: {
          userId,
          characterId: haremEntry.characterId,
        },
      });

      await tx.$executeRaw`
        UPDATE characters
        SET "claimCount" = GREATEST(0, "claimCount" - 1)
        WHERE id = ${haremEntry.characterId}
      `;
    });

    return {
      success: true,
      data: {
        message: `Personagem ${haremEntry.characterId} foi removido à força do harém de ${userId}.`,
      },
    };
  }
}
