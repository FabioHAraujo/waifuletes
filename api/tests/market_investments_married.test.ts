import { describe, it, expect, vi } from 'vitest';
import {
  BASE_DAILY_ZINTHOS,
  RARITY_DAYS,
  MarketInvestmentService,
} from '../src/services/MarketInvestmentService.js';
import { calculateDivorceRefund, SOULMATE_DIVORCE_VALUES } from '../src/utils/rarityCalculator.js';
import { DomainError } from '../src/errors/DomainError.js';

describe('💍 Reformulação de Cotas, Casamento e Soulmate', () => {
  it('deve ter BASE_DAILY_ZINTHOS reduzido em 30% (21.000 Zinthos)', () => {
    expect(BASE_DAILY_ZINTHOS).toBe(21000);
    expect(RARITY_DAYS.COMMON * BASE_DAILY_ZINTHOS).toBe(315000); // 15 * 21k
    expect(RARITY_DAYS.LEGENDARY * BASE_DAILY_ZINTHOS).toBe(4410000); // 210 * 21k
  });

  it('deve aplicar 80% de desconto na cotação para o usuário cônjuge', async () => {
    const mockCharacter = {
      id: 'makima',
      name: 'Makima',
      series: 'Chainsaw Man',
      baseRarity: 'EPIC',
      imageUrls: ['makima.jpg'],
      claimCount: 1,
      likeCount: 0,
    };

    const mockCharacterService: any = {
      findCharacter: vi.fn().mockResolvedValue(mockCharacter),
      getRandomImageUrl: vi.fn().mockReturnValue('/media/makima.jpg'),
      formatImageUrl: vi.fn().mockReturnValue('/media/makima.jpg'),
    };

    const mockPrisma: any = {
      user: {
        aggregate: vi.fn().mockResolvedValue({ _sum: { kakera: 4000000 } }),
      },
      $queryRaw: vi.fn().mockResolvedValue([
        { baseRarity: 'EPIC', total: 100n, claimed: 10n },
      ]),
      marketOffer: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      haremEntry: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'harem-1',
          userId: 'user-spouse',
          characterId: 'makima',
          keys: 2,
          user: { id: 'user-spouse', name: 'Marido' },
        }),
      },
      soulmate: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
      characterInvestment: {
        findMany: vi.fn().mockResolvedValue([]),
      },
    };

    const service = new MarketInvestmentService(mockPrisma, mockCharacterService);

    // Cotação para o próprio cônjuge
    const quoteSpouse = await service.getCharacterQuote('makima', 'user-spouse');
    expect(quoteSpouse.character.isOwner).toBe(true);
    expect(quoteSpouse.character.isSoulmate).toBe(false);
    expect(quoteSpouse.pricing.discountPercent).toBe(80);
    // 80% de desconto sobre a cota base
    expect(quoteSpouse.pricing.cotaPrice).toBe(Math.round(quoteSpouse.pricing.baseCotaPrice * 0.20));

    // Cotação para terceiro
    const quoteOther = await service.getCharacterQuote('makima', 'user-stranger');
    expect(quoteOther.character.isOwner).toBe(false);
    expect(quoteOther.pricing.canInvest).toBe(false);
  });

  it('deve bloquear compra de cotas se waifu já for Soulmate', async () => {
    const mockCharacter = {
      id: 'frieren',
      name: 'Frieren',
      series: 'Sousou no Frieren',
      baseRarity: 'LEGENDARY',
      imageUrls: [],
    };

    const mockCharacterService: any = {
      findCharacter: vi.fn().mockResolvedValue(mockCharacter),
      getRandomImageUrl: vi.fn().mockReturnValue(''),
      formatImageUrl: vi.fn().mockReturnValue(''),
    };

    const mockPrisma: any = {
      user: {
        aggregate: vi.fn().mockResolvedValue({ _sum: { kakera: 4000000 } }),
        findUnique: vi.fn().mockResolvedValue({ id: 'user-1', kakera: 10000000 }),
      },
      $queryRaw: vi.fn().mockResolvedValue([]),
      marketOffer: { findMany: vi.fn().mockResolvedValue([]) },
      haremEntry: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'harem-2',
          userId: 'user-1',
          characterId: 'frieren',
          keys: 10, // Soulmate!
          user: { id: 'user-1', name: 'Jogador' },
        }),
      },
      soulmate: {
        findUnique: vi.fn().mockResolvedValue({ id: 'soul-1', userId: 'user-1', characterId: 'frieren' }),
      },
      characterInvestment: {
        findMany: vi.fn().mockResolvedValue([]),
        findUnique: vi.fn().mockResolvedValue(null),
      },
    };

    const service = new MarketInvestmentService(mockPrisma, mockCharacterService);

    await expect(
      service.invest({
        userId: 'user-1',
        characterIdOrSlug: 'frieren',
        shares: 1,
      })
    ).rejects.toThrowError(DomainError);

    await expect(
      service.invest({
        userId: 'user-1',
        characterIdOrSlug: 'frieren',
        shares: 1,
      })
    ).rejects.toThrow('Este personagem já é sua Alma Gêmea (Soulmate).');
  });

  it('deve bloquear terceiro de investir em waifu casada com outro usuário', async () => {
    const mockCharacter = {
      id: 'marin',
      name: 'Marin Kitagawa',
      series: 'Sono Bisque Doll',
      baseRarity: 'EPIC',
      imageUrls: [],
    };

    const mockCharacterService: any = {
      findCharacter: vi.fn().mockResolvedValue(mockCharacter),
      getRandomImageUrl: vi.fn().mockReturnValue(''),
      formatImageUrl: vi.fn().mockReturnValue(''),
    };

    const mockPrisma: any = {
      user: {
        aggregate: vi.fn().mockResolvedValue({ _sum: { kakera: 4000000 } }),
        findUnique: vi.fn().mockResolvedValue({ id: 'user-stranger', kakera: 5000000 }),
      },
      $queryRaw: vi.fn().mockResolvedValue([]),
      marketOffer: { findMany: vi.fn().mockResolvedValue([]) },
      haremEntry: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'harem-3',
          userId: 'user-husband',
          characterId: 'marin',
          keys: 3,
          user: { id: 'user-husband', name: 'Gojo' },
        }),
      },
      soulmate: { findUnique: vi.fn().mockResolvedValue(null) },
      characterInvestment: { findMany: vi.fn().mockResolvedValue([]) },
    };

    const service = new MarketInvestmentService(mockPrisma, mockCharacterService);

    await expect(
      service.invest({
        userId: 'user-stranger',
        characterIdOrSlug: 'marin',
        shares: 1,
      })
    ).rejects.toThrow('Apenas o cônjuge pode investir em personagens casados.');
  });
});
