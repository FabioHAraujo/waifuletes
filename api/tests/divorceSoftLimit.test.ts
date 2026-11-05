import { describe, it, expect, beforeEach } from 'vitest';
import { Rarity } from '@prisma/client';
import {
  getDailyDivorceRate,
  calculateDivorceRefund,
  DAILY_DIVORCE_TIER_RATES,
  DAILY_DIVORCE_MIN_RATE,
} from '../src/utils/rarityCalculator.js';
import { DivorceService } from '../src/services/DivorceService.js';

describe('💔 Soft Limite Diário de Divórcio por Raridade', () => {
  describe('1. Função getDailyDivorceRate', () => {
    it('deve retornar 100% (1.0) para o 1º divórcio do dia', () => {
      expect(getDailyDivorceRate(1)).toBe(1.0);
      expect(getDailyDivorceRate(0)).toBe(1.0);
    });

    it('deve retornar 80% (0.8) para o 2º divórcio do dia', () => {
      expect(getDailyDivorceRate(2)).toBe(0.8);
    });

    it('deve retornar 50% (0.5) para o 3º divórcio do dia', () => {
      expect(getDailyDivorceRate(3)).toBe(0.5);
    });

    it('deve retornar 20% (0.2) para o 4º divórcio do dia', () => {
      expect(getDailyDivorceRate(4)).toBe(0.2);
    });

    it('deve retornar 5% (0.05) para o 5º divórcio em diante', () => {
      expect(getDailyDivorceRate(5)).toBe(0.05);
      expect(getDailyDivorceRate(6)).toBe(0.05);
      expect(getDailyDivorceRate(20)).toBe(0.05);
    });
  });

  describe('2. Cálculo de calculateDivorceRefund com taxas diárias', () => {
    it('deve manter 100% do reembolso quando dailyDivorceRate for 1.0 ou omitido', () => {
      const refundDefault = calculateDivorceRefund('EPIC', 0);
      const refundRate100 = calculateDivorceRefund('EPIC', 0, { dailyDivorceRate: 1.0 });

      expect(refundDefault.netKakera).toBe(refundDefault.fullNetKakera);
      expect(refundRate100.netKakera).toBe(refundDefault.fullNetKakera);
      expect(refundRate100.dailyDivorceRate).toBe(1.0);
    });

    it('deve reduzir para 80% no 2º divórcio', () => {
      const fullRefund = calculateDivorceRefund('EPIC', 0, { dailyDivorceRate: 1.0 });
      const refund80 = calculateDivorceRefund('EPIC', 0, { dailyDivorceRate: 0.8 });

      expect(refund80.netKakera).toBe(Math.floor(fullRefund.fullNetKakera * 0.8));
      expect(refund80.fullNetKakera).toBe(fullRefund.fullNetKakera);
      expect(refund80.dailyDivorceRate).toBe(0.8);
    });

    it('deve reduzir para 50% no 3º divórcio', () => {
      const fullRefund = calculateDivorceRefund('RARE', 1, { dailyDivorceRate: 1.0 });
      const refund50 = calculateDivorceRefund('RARE', 1, { dailyDivorceRate: 0.5 });

      expect(refund50.netKakera).toBe(Math.floor(fullRefund.fullNetKakera * 0.5));
      expect(refund50.dailyDivorceRate).toBe(0.5);
    });

    it('deve reduzir para 20% no 4º divórcio', () => {
      const fullRefund = calculateDivorceRefund('LEGENDARY', 2, { dailyDivorceRate: 1.0 });
      const refund20 = calculateDivorceRefund('LEGENDARY', 2, { dailyDivorceRate: 0.2 });

      expect(refund20.netKakera).toBe(Math.floor(fullRefund.fullNetKakera * 0.2));
      expect(refund20.dailyDivorceRate).toBe(0.2);
    });

    it('deve reduzir para 5% no 5º divórcio (piso mínimo)', () => {
      const fullRefund = calculateDivorceRefund('COMMON', 0, { dailyDivorceRate: 1.0 });
      const refund05 = calculateDivorceRefund('COMMON', 0, { dailyDivorceRate: 0.05 });

      expect(refund05.netKakera).toBe(Math.floor(fullRefund.fullNetKakera * 0.05));
      expect(refund05.dailyDivorceRate).toBe(0.05);
      expect(refund05.netKakera).toBeGreaterThanOrEqual(1);
    });
  });

  describe('3. DivorceService com contadores independentes por raridade', () => {
    let memoryStore: Record<string, string>;
    let mockRedis: any;

    beforeEach(() => {
      memoryStore = {};
      mockRedis = {
        get: async (key: string) => memoryStore[key] ?? null,
        set: async (key: string, val: string) => {
          memoryStore[key] = val;
          return 'OK';
        },
        exists: async (key: string) => (memoryStore[key] !== undefined ? 1 : 0),
        incr: async (key: string) => {
          const cur = parseInt(memoryStore[key] || '0', 10);
          const next = cur + 1;
          memoryStore[key] = String(next);
          return next;
        },
      };
    });

    it('deve manter contagens diárias completamente isoladas entre raridades', async () => {
      const mockPrisma: any = {
        $queryRaw: async () => [{ count: BigInt(0) }],
      };

      const divorceService = new DivorceService(mockPrisma, undefined, mockRedis);

      // Usuário divorcia 2 COMMONs
      await divorceService.incrementDailyDivorceCount('user1', 'COMMON');
      await divorceService.incrementDailyDivorceCount('user1', 'COMMON');

      const countCommon = await divorceService.getDailyDivorceCount('user1', 'COMMON');
      const countEpic = await divorceService.getDailyDivorceCount('user1', 'EPIC');
      const countLegendary = await divorceService.getDailyDivorceCount('user1', 'LEGENDARY');

      expect(countCommon).toBe(2);
      expect(countEpic).toBe(0);
      expect(countLegendary).toBe(0);

      // Próximo divórcio COMMON será o 3º (50%)
      const nextCommonRate = getDailyDivorceRate(countCommon + 1);
      expect(nextCommonRate).toBe(0.5);

      // Próximo divórcio EPIC será o 1º (100%)
      const nextEpicRate = getDailyDivorceRate(countEpic + 1);
      expect(nextEpicRate).toBe(1.0);
    });

    it('deve projetar corretamente o tier e o aviso do próximo divórcio no preview', async () => {
      const mockPrisma: any = {
        haremEntry: {
          findFirst: async () => ({
            id: 'harem1',
            userId: 'user1',
            characterId: 'char_makima',
            keys: 2,
            character: {
              id: 'char_makima',
              name: 'Makima',
              baseRarity: 'EPIC',
            },
          }),
        },
        soulmate: {
          findUnique: async () => null,
        },
        user: {
          aggregate: async () => ({ _sum: { kakera: 5000000 } }),
        },
        $queryRaw: async () => [{ count: BigInt(0) }],
      };

      const divorceService = new DivorceService(mockPrisma, undefined, mockRedis);

      // 1º preview (nenhum divórcio hoje de EPIC): taxa 100%, próximo será 80%
      const preview1 = await divorceService.previewDivorce('user1', 'char_makima');
      expect(preview1.dailyDivorceCount).toBe(0);
      expect(preview1.divorceTier).toBe(1);
      expect(preview1.refundRate).toBe(1.0);
      expect(preview1.refundRatePercent).toBe('100%');
      expect(preview1.nextTierRefundRate).toBe(0.8);
      expect(preview1.refundedKakera).toBe(preview1.fullRefundKakera);

      // Simula que o 1º divórcio foi executado
      await divorceService.incrementDailyDivorceCount('user1', 'EPIC');

      // 2º preview: taxa 80%, próximo será 50%
      const preview2 = await divorceService.previewDivorce('user1', 'char_makima');
      expect(preview2.dailyDivorceCount).toBe(1);
      expect(preview2.divorceTier).toBe(2);
      expect(preview2.refundRate).toBe(0.8);
      expect(preview2.refundRatePercent).toBe('80%');
      expect(preview2.nextTierRefundRate).toBe(0.5);
      expect(preview2.refundedKakera).toBeLessThan(preview2.fullRefundKakera);
      expect(preview2.refundedKakera).toBe(Math.floor(preview2.fullRefundKakera * 0.8));
    });
  });
});
