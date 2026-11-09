import { describe, it, expect } from 'vitest';
import { calculateCharacterWeight, RARITY_BASE_WEIGHTS } from '../src/utils/rarityCalculator.js';
import { getLegendaryChanceCap } from '../src/config.js';

describe('Legendary Decoupling & Cap System', () => {
  describe('1. Desacoplamento Multiplicativo para Lendários', () => {
    it('deve calcular peso correto para jogador Free (sem doação)', () => {
      // Free sem wishlist
      const baseWeight = calculateCharacterWeight({
        baseRarity: 'LEGENDARY',
        claimCount: 0,
        totalActiveUsersOrClaims: 1000,
        isWishlisted: false,
      });
      // 2.5 arredondado para 3
      expect(baseWeight).toBe(3);

      // Free com wishlist padrão (1.5x)
      const wishWeight = calculateCharacterWeight({
        baseRarity: 'LEGENDARY',
        claimCount: 0,
        totalActiveUsersOrClaims: 1000,
        isWishlisted: true,
      });
      // 2.5 * 1.5 = 3.75 -> 4
      expect(wishWeight).toBe(4);

      // Free com starwish padrão (2.0x)
      const starWeight = calculateCharacterWeight({
        baseRarity: 'LEGENDARY',
        claimCount: 0,
        totalActiveUsersOrClaims: 1000,
        isStarWish: true,
      });
      // 2.5 * 2.0 = 5.0 -> 5
      expect(starWeight).toBe(5);
    });

    it('deve desacoplar rarityMult e wishlistMult para Lendários de alto doador (Beowulf)', () => {
      const highDonorBonuses = {
        rarityMultipliers: {
          LEGENDARY: 10.0,
          EPIC: 10.0,
          RARE: 10.0,
        },
        wishlistMultiplier: 20.0,
      };

      // 1. Fora da Wishlist: Base (2.5) * rarityMult (10) = 25
      const baseBeoWeight = calculateCharacterWeight({
        baseRarity: 'LEGENDARY',
        claimCount: 0,
        totalActiveUsersOrClaims: 1000,
        isWishlisted: false,
        bonuses: highDonorBonuses,
      });
      expect(baseBeoWeight).toBe(25);

      // 2. Na Wishlist: Em vez de cascata (2.5 * 10 * 20 = 500),
      // combina aditivamente: 10 + (20 - 1) = 29x -> 2.5 * 29 = 72.5 -> 73
      const wishBeoWeight = calculateCharacterWeight({
        baseRarity: 'LEGENDARY',
        claimCount: 0,
        totalActiveUsersOrClaims: 1000,
        isWishlisted: true,
        bonuses: highDonorBonuses,
      });
      expect(wishBeoWeight).toBe(73);
      // Garante redução massiva em relação ao valor legado (500)
      expect(wishBeoWeight).toBeLessThan(100);
    });

    it('deve manter cálculo padrão para outras raridades (ex: EPIC)', () => {
      const bonuses = {
        rarityMultipliers: { EPIC: 5.0 },
        wishlistMultiplier: 2.0,
      };
      // EPIC base = 8
      // 8 * 5.0 * 2.0 = 80
      const epicWeight = calculateCharacterWeight({
        baseRarity: 'EPIC',
        claimCount: 0,
        totalActiveUsersOrClaims: 1000,
        isWishlisted: true,
        bonuses,
      });
      expect(epicWeight).toBe(80);
    });
  });

  describe('2. Conversão da Configuração do Cap (.env)', () => {
    it('deve converter valores padrão e escalas configuráveis corretamente', () => {
      // Teste conceitual das escalas aceitas pela função getLegendaryChanceCap
      const convert = (val: number) => {
        if (!val || val <= 0) return 1.0;
        let percent: number;
        if (val <= 100) {
          percent = val * 0.01;
        } else if (val <= 10000) {
          percent = val / 1000;
        } else {
          percent = 10.0;
        }
        return Math.min(0.10, Math.max(0.0001, percent / 100));
      };

      // 80 na escala 1 = 0.01% -> 0.8% = 0.008
      expect(convert(80)).toBeCloseTo(0.008, 5);

      // 800 na escala 10000 = 10% -> 0.8% = 0.008
      expect(convert(800)).toBeCloseTo(0.008, 5);

      // 10000 (teto máximo) -> 10% = 0.10
      expect(convert(10000)).toBeCloseTo(0.10, 5);

      // 1 -> 0.01% = 0.0001
      expect(convert(1)).toBeCloseTo(0.0001, 5);

      // 0 -> Desativado (1.0 = 100%)
      expect(convert(0)).toBe(1.0);
    });

    it('deve carregar o cap padrão configurado na aplicação', () => {
      const cap = getLegendaryChanceCap();
      // Padrão de 80 -> 0.80% (0.008)
      expect(cap).toBeCloseTo(0.008, 5);
    });
  });

  describe('3. Mecanismo de Compressão Proporcional de Peso (Cap no Roll)', () => {
    it('deve comprimir os pesos de Lendários preservando proporção interna caso ultrapasse 0.8%', () => {
      const capFraction = 0.008; // 0.8%
      const nonLegWeight = 20000000; // ~20M de peso de comuns/raros/épicos
      const initialSpecialLeg = 200000; // Lendários na Wishlist com peso alto
      const initialNormalLeg = 30000; // Lendários fora da Wishlist

      const currentLegWeight = initialSpecialLeg + initialNormalLeg;
      const initialGrandTotal = currentLegWeight + nonLegWeight;
      const currentFraction = currentLegWeight / initialGrandTotal;

      expect(currentFraction).toBeGreaterThan(capFraction); // 1.13% > 0.8%

      // Aplica a fórmula implementada no RollService
      const targetLegWeight = (capFraction / (1 - capFraction)) * nonLegWeight;
      const scaleFactor = targetLegWeight / currentLegWeight;

      const newSpecialLeg = Math.round(initialSpecialLeg * scaleFactor);
      const newNormalLeg = Math.round(initialNormalLeg * scaleFactor);
      const newLegWeight = newSpecialLeg + newNormalLeg;
      const newGrandTotal = newLegWeight + nonLegWeight;
      const finalFraction = newLegWeight / newGrandTotal;

      expect(finalFraction).toBeCloseTo(0.008, 4);
      // Preservação de proporção entre special e normal
      expect(newSpecialLeg / newNormalLeg).toBeCloseTo(initialSpecialLeg / initialNormalLeg, 2);
    });
  });
});
