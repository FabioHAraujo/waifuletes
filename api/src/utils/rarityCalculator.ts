import { Rarity } from '@prisma/client';

export const RARITY_BASE_WEIGHTS: Record<Rarity, number> = {
  LEGENDARY: 2.5,
  EPIC: 8,
  RARE: 25,
  UNCOMMON: 60,
  COMMON: 100,
};

// Valores de cristal de Kakera gerado em sorteios casuais de personagens já casados
export const KAKERA_CRYSTAL_BASE: Record<Rarity, number> = {
  COMMON: 10,
  UNCOMMON: 30,
  RARE: 70,
  EPIC: 140,
  LEGENDARY: 300,
};

// Valores de divórcio comum (não-soulmate)
export const RARITY_DIVORCE_VALUES: Record<Rarity, number> = {
  COMMON: 50,
  UNCOMMON: 150,
  RARE: 350,
  EPIC: 700,
  LEGENDARY: 1500,
};

// Bônus por chave escalonado por raridade para divórcio comum
export const RARITY_KEY_DIVORCE_BONUS: Record<Rarity, number> = {
  COMMON: 500,
  UNCOMMON: 2000,
  RARE: 5000,
  EPIC: 25000,
  LEGENDARY: 75000,
};

// Valores de divórcio equivalentes a 4 COTAS exclusivo para SOULMATES (100% do preço base de mercado da waifu: RARITY_DAYS * 21.000 Zinthos)
export const SOULMATE_DIVORCE_VALUES: Record<Rarity, number> = {
  COMMON: 315000,      // 15 dias x 21.000 Zinthos (4 cotas)
  UNCOMMON: 630000,    // 30 dias x 21.000 Zinthos (4 cotas)
  RARE: 1260000,       // 60 dias x 21.000 Zinthos (4 cotas)
  EPIC: 2100000,       // 100 dias x 21.000 Zinthos (4 cotas)
  LEGENDARY: 4410000,  // 210 dias x 21.000 Zinthos (4 cotas)
};

export const SOULMATE_KEY_KAKERA_BONUS = 21000; // 21.000 Zinthos de bônus por chave para soulmates
export const KEY_KAKERA_BONUS = 15; // Legado mantido para compatibilidade
export const DIVORCE_PENALTY_RATE = 0.05; // 5% de taxa de divórcio

export interface DivorceRefundOptions {
  isSoulmate?: boolean;
  inflationMultiplier?: number;
}

export interface RollBonuses {
  donorBadge?: string;
  wishlistMultiplier?: number;
  starWishMultiplier?: number;
  rarityMultipliers?: Partial<Record<Rarity, number>>;
  extraMaxRolls?: number;
  isFreeRoll?: boolean;
}

export interface WeightCalculationParams {
  baseRarity: Rarity;
  claimCount: number;
  totalActiveUsersOrClaims: number;
  isWishlisted?: boolean;
  isStarWish?: boolean;
  bonuses?: RollBonuses;
  investmentShares?: number;
}

export function calculateCharacterWeight(params: WeightCalculationParams): number {
  let base = RARITY_BASE_WEIGHTS[params.baseRarity] ?? 100;

  // Custom rarity multiplier / donor bonus
  const rarityMult = params.bonuses?.rarityMultipliers?.[params.baseRarity];
  if (typeof rarityMult === 'number' && rarityMult > 0) {
    base *= rarityMult;
  }

  // Popularity factor: more claimed = harder to get
  const total = Math.max(1, params.totalActiveUsersOrClaims);
  const ratio = params.claimCount / total;
  const popularityFactor = Math.max(0.1, 1 - ratio * 0.5);

  let finalWeight = base * popularityFactor;

  // Wishlist and StarWish multipliers (default: 1.5x and 2.0x, or custom via bonuses)
  const defaultWishMult = 1.5;
  const defaultStarMult = 2.0;

  if (params.isStarWish) {
    const starMult = params.bonuses?.starWishMultiplier ?? defaultStarMult;
    finalWeight *= starMult;
  } else if (params.isWishlisted) {
    const wishMult = params.bonuses?.wishlistMultiplier ?? defaultWishMult;
    finalWeight *= wishMult;
  }

  // Multiplicador de Cotas de Investimento:
  // 1 cota (25%): 4x peso (+300%)
  // 2 cotas (50%): 10x peso (+900%)
  // 3 cotas (75%): 25x peso (+2400%)
  if (params.investmentShares && params.investmentShares > 0) {
    const shareMult = params.investmentShares === 1 ? 4 : params.investmentShares === 2 ? 10 : 25;
    finalWeight *= shareMult;
  }

  return Math.max(1, Math.round(finalWeight));
}

export function calculateDivorceRefund(
  baseRarity: Rarity,
  keys: number,
  optionsOrIsSoulmate?: boolean | DivorceRefundOptions,
  legacyInflation?: number
) {
  let isSoulmate = false;
  let inflationMultiplier = 1.0;

  if (typeof optionsOrIsSoulmate === 'boolean') {
    isSoulmate = optionsOrIsSoulmate;
    if (typeof legacyInflation === 'number' && legacyInflation > 0) {
      inflationMultiplier = legacyInflation;
    }
  } else if (optionsOrIsSoulmate && typeof optionsOrIsSoulmate === 'object') {
    isSoulmate = Boolean(optionsOrIsSoulmate.isSoulmate);
    if (typeof optionsOrIsSoulmate.inflationMultiplier === 'number' && optionsOrIsSoulmate.inflationMultiplier > 0) {
      inflationMultiplier = optionsOrIsSoulmate.inflationMultiplier;
    }
  }

  const baseValue = isSoulmate
    ? (SOULMATE_DIVORCE_VALUES[baseRarity] ?? 450000)
    : (RARITY_DIVORCE_VALUES[baseRarity] ?? 50);

  const bonusPerKey = isSoulmate
    ? SOULMATE_KEY_KAKERA_BONUS
    : (RARITY_KEY_DIVORCE_BONUS[baseRarity] ?? 500);

  const keysBonus = Math.max(0, keys) * bonusPerKey;
  const rawBeforeInflation = baseValue + keysBonus;
  const rawValue = Math.round(rawBeforeInflation * inflationMultiplier);

  // 5% penalty on refund
  const netKakera = Math.floor(rawValue * (1 - DIVORCE_PENALTY_RATE));
  // 5% loss of keys (minimum 0)
  const remainingKeys = Math.max(0, Math.floor(keys * (1 - DIVORCE_PENALTY_RATE)));

  return {
    baseValue,
    keysBonus,
    rawBeforeInflation,
    rawValue,
    netKakera,
    remainingKeys,
    isSoulmate,
    inflationMultiplier,
  };
}
