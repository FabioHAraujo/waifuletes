import { FastifyPluginAsync } from 'fastify';
import { KakeraService } from '../../services/KakeraService.js';
import { CharacterService } from '../../services/CharacterService.js';
import { CooldownService } from '../../services/CooldownService.js';
import { DivorceService } from '../../services/DivorceService.js';
import { MarryService } from '../../services/MarryService.js';
import { HostingFeeService } from '../../services/HostingFeeService.js';
import { NotificationService } from '../../services/NotificationService.js';
import { parseManifestString } from '../../utils/manifestLoader.js';
import { calculateDivorceRefund } from '../../utils/rarityCalculator.js';
import { config } from '../../config.js';
import { verifyApiKey } from '../../plugins/auth.js';
import { KakeraReason, Rarity } from '@prisma/client';

export const privateAdminRoutes: FastifyPluginAsync = async (fastify) => {
  const cooldownService = new CooldownService(fastify.redis);
  const kakeraService = new KakeraService(fastify.prisma, cooldownService);
  const characterService = new CharacterService(fastify.prisma);
  const divorceService = new DivorceService(fastify.prisma, undefined, fastify.redis);
  const marryService = new MarryService(fastify.prisma, cooldownService, characterService);
  const notificationService = new NotificationService(fastify.prisma);
  const hostingFeeService = new HostingFeeService(fastify.prisma, fastify.redis, notificationService, divorceService);

  fastify.addHook('preHandler', verifyApiKey);

  // Dar Kakera (Admin/Eventos)
  fastify.post('/admin/kakera/give', {
    schema: {
      description: 'Concede quantidade de moeda Kakera para um usuário (ex: eventos externos, sorteios)',
      tags: ['Administração (Privado)'],
      body: {
        type: 'object',
        required: ['userId', 'amount'],
        properties: {
          userId: { type: 'string' },
          amount: { type: 'integer', minimum: 1 },
          reason: {
            type: 'string',
            enum: ['ADMIN_GRANT', 'EVENT_REWARD', 'DAILY_REWARD', 'DIVORCE', 'ROLL_CRYSTAL', 'WISHLIST_BONUS', 'SOULMATE_BONUS'],
            default: 'ADMIN_GRANT',
          },
          metadata: { type: 'object' },
        },
      },
    },
    handler: async (request, reply) => {
      const { userId, amount, reason = 'ADMIN_GRANT', metadata } = request.body as any;

      try {
        const result = await kakeraService.adminModifyKakera({
          userId,
          amount,
          reason: reason as KakeraReason,
          metadata,
        });

        return reply.send({
          success: true,
          data: result,
        });
      } catch (err: any) {
        return reply.status(400).send({
          success: false,
          error: { code: err.message, message: err.message },
        });
      }
    },
  });

  // Conceder Kakera para todos os usuários (Evento Instantâneo)
  fastify.post('/admin/kakera/give-all', {
    schema: {
      description: 'Concede quantidade de moeda Kakera para todos os usuários cadastrados',
      tags: ['Administração (Privado)'],
      body: {
        type: 'object',
        required: ['amount'],
        properties: {
          amount: { type: 'integer', minimum: 1 },
          reason: {
            type: 'string',
            enum: ['ADMIN_GRANT', 'EVENT_REWARD', 'DAILY_REWARD', 'DIVORCE', 'ROLL_CRYSTAL', 'WISHLIST_BONUS', 'SOULMATE_BONUS'],
            default: 'EVENT_REWARD',
          },
          metadata: { type: 'object' },
        },
      },
    },
    handler: async (request, reply) => {
      const { amount, reason = 'EVENT_REWARD' } = request.body as any;

      try {
        const res = await fastify.prisma.user.updateMany({
          data: {
            kakera: { increment: amount },
          },
        });

        return reply.send({
          success: true,
          count: res.count,
          amount,
          reason,
        });
      } catch (err: any) {
        return reply.status(400).send({
          success: false,
          error: { code: err.message, message: err.message },
        });
      }
    },
  });

  // Retorna todos os IDs de usuários cadastrados (Admin)
  fastify.get('/admin/users/ids', {
    schema: {
      description: 'Retorna a lista de todos os IDs de usuários cadastrados',
      tags: ['Administração (Privado)'],
    },
    handler: async (_request, reply) => {
      try {
        const users = await fastify.prisma.user.findMany({ select: { id: true } });
        return reply.send({ success: true, count: users.length, userIds: users.map((u) => u.id) });
      } catch (err: any) {
        return reply.status(500).send({
          success: false,
          error: { code: err.message, message: err.message },
        });
      }
    },
  });

  // Remover Kakera (Admin)
  fastify.post('/admin/kakera/take', {
    schema: {
      description: 'Remove quantidade de moeda Kakera de um usuário',
      tags: ['Administração (Privado)'],
      body: {
        type: 'object',
        required: ['userId', 'amount'],
        properties: {
          userId: { type: 'string' },
          amount: { type: 'integer', minimum: 1 },
          metadata: { type: 'object' },
        },
      },
    },
    handler: async (request, reply) => {
      const { userId, amount, metadata } = request.body as any;

      try {
        const result = await kakeraService.adminModifyKakera({
          userId,
          amount: -amount,
          reason: 'ADMIN_GRANT',
          metadata,
        });

        return reply.send({
          success: true,
          data: result,
        });
      } catch (err: any) {
        return reply.status(400).send({
          success: false,
          error: { code: err.message, message: err.message },
        });
      }
    },
  });

  // Importar Manifest JSON (Multipart ou JSON direto)
  fastify.post('/admin/manifest/import', {
    schema: {
      description: 'Importa ou atualiza em lote personagens a partir de um manifest JSON (upsert por ID)',
      tags: ['Administração (Privado)'],
    },
    handler: async (request, reply) => {
      let manifestContent: string = '';

      if (request.isMultipart()) {
        const file = await request.file();
        if (!file) {
          return reply.status(400).send({
            success: false,
            error: { code: 'NO_FILE', message: 'Nenhum arquivo enviado no formulário multipart.' },
          });
        }
        manifestContent = (await file.toBuffer()).toString('utf-8');
      } else {
        manifestContent = JSON.stringify(request.body);
      }

      try {
        const parsed = parseManifestString(manifestContent);
        const CHUNK_SIZE = 500;
        let syncedCount = 0;

        for (let i = 0; i < parsed.characters.length; i += CHUNK_SIZE) {
          const chunk = parsed.characters.slice(i, i + CHUNK_SIZE).map((c) => ({
            id: c.id,
            name: c.name,
            series: c.series,
            description: c.description,
            gender: c.gender,
            baseRarity: c.baseRarity,
            rank: (c as any).rank ?? null,
            tags: c.tags,
            imageUrls: c.images,
          }));

          const res = await fastify.prisma.character.createMany({
            data: chunk,
            skipDuplicates: true,
          });
          syncedCount += res.count;
        }

        return reply.send({
          success: true,
          data: {
            totalInManifest: parsed.characters.length,
            newlyInserted: syncedCount,
          },
        });
      } catch (err: any) {
        return reply.status(400).send({
          success: false,
          error: { code: 'INVALID_MANIFEST', message: err.message },
        });
      }
    },
  });

  // Ativar / Desativar personagem globalmente
  fastify.patch('/admin/character/:id/toggle', {
    schema: {
      description: 'Ativa ou desativa um personagem globalmente do pool de sorteio',
      tags: ['Administração (Privado)'],
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string' } },
      },
      body: {
        type: 'object',
        required: ['isActive'],
        properties: { isActive: { type: 'boolean' } },
      },
    },
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      const { isActive } = request.body as { isActive: boolean };

      const updated = await characterService.toggleActive(id, isActive);

      return reply.send({
        success: true,
        data: updated,
      });
    },
  });

  // Desabilitar personagem/série em um grupo
  fastify.post('/admin/group/disable', {
    schema: {
      description: 'Desabilita um personagem específico de ser sorteado em um determinado grupo',
      tags: ['Administração (Privado)'],
      body: {
        type: 'object',
        required: ['groupId', 'characterId'],
        properties: {
          groupId: { type: 'string' },
          characterId: { type: 'string' },
        },
      },
    },
    handler: async (request, reply) => {
      const { groupId, characterId } = request.body as { groupId: string; characterId: string };

      const disabled = await fastify.prisma.groupDisabledSeries.upsert({
        where: {
          groupId_characterId: {
            groupId,
            characterId,
          },
        },
        create: { groupId, characterId },
        update: {},
      });

      return reply.send({
        success: true,
        data: {
          message: `Personagem ${characterId} desabilitado para o grupo ${groupId}.`,
          disabled,
        },
      });
    },
  });

  // Reabilitar personagem em um grupo
  fastify.delete('/admin/group/disable', {
    schema: {
      description: 'Reabilita um personagem para voltar a ser sorteado em um determinado grupo',
      tags: ['Administração (Privado)'],
      body: {
        type: 'object',
        required: ['groupId', 'characterId'],
        properties: {
          groupId: { type: 'string' },
          characterId: { type: 'string' },
        },
      },
    },
    handler: async (request, reply) => {
      const { groupId, characterId } = request.body as { groupId: string; characterId: string };

      await fastify.prisma.groupDisabledSeries.deleteMany({
        where: { groupId, characterId },
      });

      return reply.send({
        success: true,
        data: {
          message: `Personagem ${characterId} reabilitado para o grupo ${groupId}.`,
        },
      });
    },
  });

  // Reset de cooldown manual
  fastify.post('/admin/cooldown/reset', {
    schema: {
      description: 'Reseta manualmente os cooldowns de um usuário (roll, claim [opcionalmente por raridade], daily ou all)',
      tags: ['Administração (Privado)'],
      body: {
        type: 'object',
        required: ['userId', 'type'],
        properties: {
          userId: { type: 'string' },
          type: { type: 'string', enum: ['roll', 'claim', 'daily', 'all'] },
          rarity: { type: 'string', enum: ['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY'] },
        },
      },
    },
    handler: async (request, reply) => {
      const { userId, type, rarity } = request.body as {
        userId: string;
        type: 'roll' | 'claim' | 'daily' | 'all';
        rarity?: Rarity;
      };

      await cooldownService.resetCooldown(userId, type, rarity);

      const rarityMsg = rarity ? ` (raridade ${rarity})` : '';
      return reply.send({
        success: true,
        data: {
          message: `Cooldown do tipo '${type}'${rarityMsg} resetado com sucesso para o usuário ${userId}.`,
        },
      });
    },
  });

  // Forçar divórcio administrativo
  fastify.delete('/admin/harem/force-divorce', {
    schema: {
      description: 'Força a remoção de um personagem do harém de um usuário (sem devolver kakera)',
      tags: ['Administração (Privado)'],
      body: {
        type: 'object',
        required: ['userId', 'characterId'],
        properties: {
          userId: { type: 'string' },
          characterId: { type: 'string' },
        },
      },
    },
    handler: async (request, reply) => {
      const { userId, characterId } = request.body as { userId: string; characterId: string };
      const result = await divorceService.forceDivorce(userId, characterId);
      if (!result.success) {
        return reply.status(404).send(result);
      }
      return reply.send(result);
    },
  });

  // Casamento administrativo direto (SuperAdmin)
  fastify.post('/admin/marry', {
    schema: {
      description: 'Efetua o casamento/claim administrativo de um personagem para um usuário sem restrições de roll ou lock',
      tags: ['Administração (Privado)'],
      body: {
        type: 'object',
        required: ['userId', 'characterId'],
        properties: {
          userId: { type: 'string' },
          characterId: { type: 'string' },
          groupId: { type: 'string' },
          name: { type: 'string' },
        },
      },
    },
    handler: async (request, reply) => {
      const { userId, characterId, groupId = 'admin', name } = request.body as any;

      const result = await marryService.adminMarry({
        userId,
        characterId,
        groupId,
        name,
      });

      if (!result.success) {
        return reply.status(400).send(result);
      }

      return reply.send(result);
    },
  });

  // Estatísticas globais do servidor
  fastify.get('/admin/stats', {
    schema: {
      description: 'Retorna contadores e estatísticas gerais do servidor',
      tags: ['Administração (Privado)'],
    },
    handler: async (request, reply) => {
      const [totalUsers, totalGroups, totalCharacters, totalClaims, totalSoulmates, totalKakera] = await Promise.all([
        fastify.prisma.user.count(),
        fastify.prisma.group.count(),
        fastify.prisma.character.count(),
        fastify.prisma.haremEntry.count(),
        fastify.prisma.soulmate.count(),
        fastify.prisma.user.aggregate({ _sum: { kakera: true } }),
      ]);

      return reply.send({
        success: true,
        data: {
          totalUsers,
          totalGroups,
          totalCharacters,
          totalClaims,
          totalSoulmates,
          totalKakeraCirculating: totalKakera._sum.kakera ?? 0,
        },
      });
    },
  });

  // Estatísticas consolidadas para o resumo semanal da Ravena
  fastify.get('/admin/stats/weekly', {
    schema: {
      description: 'Estatísticas consolidadas para o resumo semanal da Ravena',
      tags: ['Administração (Privado)'],
    },
    handler: async (request, reply) => {
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      // 1. Casamentos na semana por raridade
      const weeklyMarriagesByRarity: Array<{ rarity: string; count: number }> = await fastify.prisma.$queryRaw`
        SELECT c."baseRarity" as rarity, count(h.id)::int as count
        FROM harem_entries h
        JOIN characters c ON c.id = h."characterId"
        WHERE h."claimedAt" >= ${since}
        GROUP BY c."baseRarity"
      `;

      // 2. Negociações concluídas no Mercado
      const weeklyNegotiationsCount = await fastify.prisma.marketOffer.count({
        where: {
          status: 'ACCEPTED',
          updatedAt: { gte: since },
        },
      });

      // 3. Top casamenteiro da semana
      const topMarrier: Array<{ id: string; name: string; count: number }> = await fastify.prisma.$queryRaw`
        SELECT u.id, u.name, count(h.id)::int as count
        FROM harem_entries h
        JOIN users u ON u.id = h."userId"
        WHERE h."claimedAt" >= ${since}
        GROUP BY u.id, u.name
        ORDER BY count DESC
        LIMIT 1
      `;

      // 4. Waifu mais cobiçada / favoritada na semana
      const mostCoveted: Array<{ id: string; name: string; series: string; count: number }> = await fastify.prisma.$queryRaw`
        SELECT c.id, c.name, c.series, count(w.id)::int as count
        FROM wishlist_entries w
        JOIN characters c ON c.id = w."characterId"
        WHERE w."addedAt" >= ${since}
        GROUP BY c.id, c.name, c.series
        ORDER BY count DESC
        LIMIT 1
      `;

      // 5. Novas Almas Gêmeas (Soulmates) seladas
      const weeklySoulmatesCount = await fastify.prisma.soulmate.count({
        where: { becameSoulmateAt: { gte: since } },
      });

      // 6. Percentual de cada categoria já casada (Global)
      const categoryStats: Array<{
        rarity: string;
        total: number;
        married: number;
        percentage: number;
      }> = await fastify.prisma.$queryRaw`
        SELECT 
          c."baseRarity" as rarity,
          count(c.id)::int as "total",
          count(h.id)::int as "married",
          round((count(h.id)::numeric / count(c.id)::numeric) * 100, 2)::float as "percentage"
        FROM characters c
        LEFT JOIN harem_entries h ON h."characterId" = c.id
        WHERE c."isActive" = true
        GROUP BY c."baseRarity"
        ORDER BY 
          CASE c."baseRarity"
            WHEN 'COMMON' THEN 1
            WHEN 'UNCOMMON' THEN 2
            WHEN 'RARE' THEN 3
            WHEN 'EPIC' THEN 4
            WHEN 'LEGENDARY' THEN 5
            ELSE 6
          END
      `;

      return reply.send({
        success: true,
        data: {
          weeklyMarriagesByRarity,
          weeklyNegotiationsCount,
          weeklySoulmatesCount,
          topMarrier: topMarrier[0] || null,
          mostCoveted: mostCoveted[0] || null,
          categoryStats,
        },
      });
    },
  });

  // Remoção administrativa de personagem problemático (SuperAdmin)
  fastify.post('/admin/characters/purge-character', {
    schema: {
      description: 'Remove um personagem problemático do catálogo, desfaz casamentos ativos e reembolsa donos com base na raridade',
      tags: ['Administração (Privado)'],
      body: {
        type: 'object',
        required: ['characterId'],
        properties: {
          characterId: { type: 'string' },
          reason: { type: 'string', default: 'Denúncia / Personagem problemático' },
        },
      },
    },
    handler: async (request, reply) => {
      const { characterId, reason = 'Denúncia / Personagem problemático' } = request.body as any;

      const cleanId = String(characterId).trim();
      let character = await fastify.prisma.character.findUnique({
        where: { id: cleanId },
        include: {
          haremEntries: true,
        },
      });

      if (!character && cleanId.toLowerCase() !== cleanId) {
        character = await fastify.prisma.character.findUnique({
          where: { id: cleanId.toLowerCase() },
          include: {
            haremEntries: true,
          },
        });
      }

      if (!character) {
        character = await fastify.prisma.character.findFirst({
          where: {
            name: { equals: cleanId, mode: 'insensitive' },
          },
          include: {
            haremEntries: true,
          },
        });
      }

      if (!character) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'CHARACTER_NOT_FOUND',
            message: `Personagem '${characterId}' não encontrado.`,
          },
        });
      }

      const refunds: Array<{ userId: string; refundedKakera: number }> = [];

      const soulmateUserIds = new Set(
        (await fastify.prisma.soulmate.findMany({
          where: { characterId: character.id },
          select: { userId: true },
        })).map((s) => s.userId)
      );

      await fastify.prisma.$transaction(async (tx) => {
        for (const entry of character.haremEntries) {
          const isSoulmate = entry.keys >= (config.SOULMATE_KEYS_REQUIRED ?? 10) || soulmateUserIds.has(entry.userId);
          const refund = calculateDivorceRefund(character.baseRarity, entry.keys, { isSoulmate });
          await tx.user.update({
            where: { id: entry.userId },
            data: { kakera: { increment: refund.netKakera } },
          });

          await tx.kakeraTransaction.create({
            data: {
              userId: entry.userId,
              amount: refund.netKakera,
              reason: 'DIVORCE',
              metadata: {
                characterId: character.id,
                characterName: character.name,
                rarity: character.baseRarity,
                keys: entry.keys,
                forced: true,
                reason,
              },
            },
          });

          refunds.push({ userId: entry.userId, refundedKakera: refund.netKakera });
        }

        await tx.haremEntry.deleteMany({ where: { characterId: character.id } });
        await tx.soulmate.deleteMany({ where: { characterId: character.id } });
        await tx.wishlistEntry.deleteMany({ where: { characterId: character.id } });
        await tx.groupDisabledSeries.deleteMany({ where: { characterId: character.id } });

        await tx.character.delete({ where: { id: character.id } });
      });

      return reply.send({
        success: true,
        data: {
          character: {
            id: character.id,
            name: character.name,
            series: character.series,
            rarity: character.baseRarity,
          },
          marriagesUndone: character.haremEntries.length,
          totalKakeraRefunded: refunds.reduce((acc, r) => acc + r.refundedKakera, 0),
          refunds,
          message: `Personagem '${character.name}' (${character.id}) removido com sucesso. ${character.haremEntries.length} casamento(s) desfeito(s).`,
        },
      });
    },
  });

  // Deletar usuário e liberar casamentos associados (Admin/Testes)
  fastify.delete('/admin/users/:userId', {
    schema: {
      description: 'Remove um usuário e todas as suas dependências (casamentos, sugestões, etc), liberando os personagens casados',
      tags: ['Administração (Privado)'],
      params: {
        type: 'object',
        required: ['userId'],
        properties: {
          userId: { type: 'string' },
        },
      },
    },
    handler: async (request, reply) => {
      const { userId } = request.params as { userId: string };

      const user = await fastify.prisma.user.findUnique({
        where: { id: userId },
        include: {
          harem: { select: { characterId: true } },
        },
      });

      if (!user) {
        return reply.status(404).send({
          success: false,
          error: { code: 'USER_NOT_FOUND', message: `Usuário '${userId}' não encontrado.` },
        });
      }

      const characterIds = user.harem.map((h) => h.characterId);

      await fastify.prisma.$transaction(async (tx) => {
        if (characterIds.length > 0) {
          await tx.$executeRaw`
            UPDATE characters
            SET "claimCount" = GREATEST(0, "claimCount" - 1)
            WHERE id = ANY(${characterIds})
          `;
        }

        await tx.haremEntry.deleteMany({ where: { userId } });
        await tx.soulmate.deleteMany({ where: { userId } });
        await tx.wishlistEntry.deleteMany({ where: { userId } });
        await tx.characterSuggestion.deleteMany({ where: { userId } });
        await tx.userNotification.deleteMany({ where: { userId } });
        await tx.userCollection.deleteMany({ where: { userId } });
        await tx.characterInvestment.deleteMany({ where: { userId } });
        await tx.kakeraTransaction.deleteMany({ where: { userId } });
        await tx.userGroup.deleteMany({ where: { userId } });
        await tx.user.delete({ where: { id: userId } });
      });

      return reply.send({
        success: true,
        data: {
          userId,
          freedCharactersCount: characterIds.length,
          message: `Usuário '${userId}' removido com sucesso e ${characterIds.length} casamento(s) desfeito(s).`,
        },
      });
    },
  });

  // Limpeza geral de dados de teste (Admin/Testes)
  fastify.post('/admin/cleanup-test-data', {
    schema: {
      description: 'Remove em lote todos os dados de testes automatizados (usuários teste, sugestões teste, grupos teste) e desfaz casamentos de teste',
      tags: ['Administração (Privado)'],
    },
    handler: async (_request, reply) => {
      const testUsers = await fastify.prisma.user.findMany({
        where: {
          AND: [
            { id: { not: 'test-user-1' } },
            {
              OR: [
                {
                  name: {
                    in: [
                      'Test User',
                      'Roll Tester',
                      'Outro Jogador Teste',
                      'Daily Tester',
                      'Tester',
                      'Concurrent Tester',
                      'Jogador Harem Teste',
                      'RollTester',
                      'test_validation_user',
                      'Seed Init User',
                      'Jogador Web Teste',
                      'Jogador Teste Já Lendário',
                      'Jogador Novas Features',
                      'Jogador Teste',
                      'Jogador Teste Casamentos',
                    ],
                  },
                },
                { id: { startsWith: 'test_' } },
                { id: { startsWith: 'another_user_' } },
                { id: { startsWith: 'seed_' } },
                { id: { startsWith: 'roll_tester_' } },
              ],
            },
          ],
        },
        select: {
          id: true,
          harem: { select: { characterId: true } },
        },
      });

      const testUserIds = testUsers.map((u) => u.id);
      const characterIds = Array.from(new Set(testUsers.flatMap((u) => u.harem.map((h) => h.characterId))));

      let freedMarriages = 0;
      let deletedUsers = 0;
      let deletedSuggestions = 0;
      let deletedGroups = 0;

      await fastify.prisma.$transaction(async (tx) => {
        if (characterIds.length > 0) {
          await tx.$executeRaw`
            UPDATE characters
            SET "claimCount" = GREATEST(0, "claimCount" - 1)
            WHERE id = ANY(${characterIds})
          `;
        }

        if (testUserIds.length > 0) {
          const haremRes = await tx.haremEntry.deleteMany({ where: { userId: { in: testUserIds } } });
          freedMarriages = haremRes.count;

          await tx.soulmate.deleteMany({ where: { userId: { in: testUserIds } } });
          await tx.wishlistEntry.deleteMany({ where: { userId: { in: testUserIds } } });
          await tx.userNotification.deleteMany({ where: { userId: { in: testUserIds } } });
          await tx.userCollection.deleteMany({ where: { userId: { in: testUserIds } } });
          await tx.characterInvestment.deleteMany({ where: { userId: { in: testUserIds } } });
          await tx.kakeraTransaction.deleteMany({ where: { userId: { in: testUserIds } } });
          await tx.userGroup.deleteMany({ where: { userId: { in: testUserIds } } });
          const userRes = await tx.user.deleteMany({ where: { id: { in: testUserIds } } });
          deletedUsers = userRes.count;
        }

        const suggRes = await tx.characterSuggestion.deleteMany({
          where: {
            OR: [
              ...(testUserIds.length > 0 ? [{ userId: { in: testUserIds } }] : []),
              { reason: { contains: 'debounce', mode: 'insensitive' } },
              { suggestedName: { contains: 'debounce', mode: 'insensitive' } },
              { reason: { contains: 'Sugestão para validar', mode: 'insensitive' } },
              { reason: { contains: 'Sugestão de teste', mode: 'insensitive' } },
            ],
          },
        });
        deletedSuggestions = suggRes.count;

        const grpRes = await tx.group.deleteMany({
          where: {
            OR: [
              { id: { startsWith: 'test_' } },
              { id: { startsWith: 'group_roll_tester_' } },
              { id: 'test-group-1' },
            ],
          },
        });
        deletedGroups = grpRes.count;
      });

      return reply.send({
        success: true,
        data: {
          deletedUsers,
          freedMarriages,
          deletedSuggestions,
          deletedGroups,
          message: `Limpeza concluída: ${deletedUsers} usuários removidos, ${freedMarriages} casamentos desfeitos, ${deletedSuggestions} sugestões e ${deletedGroups} grupos de teste apagados.`,
        },
      });
    },
  });

  fastify.post('/admin/daily-hosting-fee', {
    schema: {
      description: 'Executa a cobrança da taxa diária de hospedagem (ativa e inativa) e confisco',
      tags: ['Administração (Privado)'],
      body: {
        type: 'object',
        properties: {
          dryRun: { type: 'boolean', default: false },
          force: { type: 'boolean', default: false },
        },
        additionalProperties: false,
      },
    },
    handler: async (request, reply) => {
      const { dryRun = false, force = false } = (request.body as any) || {};
      try {
        const summary = await hostingFeeService.runDailyFee({ dryRun, force });
        return reply.send({ success: true, data: summary });
      } catch (err: any) {
        return reply.status(400).send({
          success: false,
          error: { code: 'HOSTING_FEE_ERROR', message: err.message },
        });
      }
    },
  });
};
