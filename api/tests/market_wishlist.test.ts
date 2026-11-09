import { describe, it, expect } from 'vitest';
import { MarketService } from '../src/services/MarketService.js';
import { WishlistService } from '../src/services/WishlistService.js';

describe('🛍️ Wishlist nos Classificados & Badge À Venda', () => {
  it('MarketService.getWishlistListings deve filtrar listings ativas de waifus na wishlist do usuário', async () => {
    let capturedWhere: any = null;

    const mockPrisma: any = {
      marketListing: {
        findMany: async (args: any) => {
          capturedWhere = args.where;
          return [
            {
              id: 'listing_1',
              userId: 'seller_123',
              characterId: 'char_1',
              status: 'ACTIVE',
              interest: 'Busco Megumin',
              createdAt: new Date(),
              user: { id: 'seller_123', name: 'Seller Player', publicId: 'seller_pub' },
              character: {
                id: 'char_1',
                name: 'Rem',
                series: 'Re:Zero',
                baseRarity: 'LEGENDARY',
                imageUrls: ['rem.png'],
                _count: { wishlists: 15 },
                haremEntries: [{ userId: 'seller_123', keys: 12, isFavorite: true }],
              },
            },
          ];
        },
      },
    };

    const marketService = new MarketService(mockPrisma);
    const results = await marketService.getWishlistListings('buyer_user_1');

    expect(capturedWhere).toMatchObject({
      status: 'ACTIVE',
      character: {
        wishlists: {
          some: { userId: 'buyer_user_1' },
        },
      },
    });

    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('listing_1');
    expect(results[0].character.name).toBe('Rem');
    expect(results[0].keys).toBe(12);
    expect(results[0].isSoulmate).toBe(true);
  });

  it('WishlistService.getWishlist deve marcar isForSale=true apenas se houver listing ativa', async () => {
    const mockPrisma: any = {
      wishlistEntry: {
        findMany: async () => [
          {
            id: 'wish_1',
            userId: 'user_1',
            isStarWish: false,
            addedAt: new Date(),
            character: {
              id: 'char_1',
              name: 'Aqua',
              series: 'Konosuba',
              baseRarity: 'RARE',
              imageUrls: ['aqua.jpg'],
              _count: { wishlists: 5 },
              marketListings: [{ id: 'listing_aqua' }],
              haremEntries: [],
            },
          },
          {
            id: 'wish_2',
            userId: 'user_1',
            isStarWish: true,
            addedAt: new Date(),
            character: {
              id: 'char_2',
              name: 'Megumin',
              series: 'Konosuba',
              baseRarity: 'EPIC',
              imageUrls: ['megumin.jpg'],
              _count: { wishlists: 20 },
              marketListings: [],
              haremEntries: [],
            },
          },
        ],
      },
    };

    const mockCharService: any = {
      getRandomImageUrl: (_id: string, urls: string[]) => urls[0],
      formatImageUrl: (_id: string, img: string) => img,
    };

    const wishlistService = new WishlistService(mockPrisma, mockCharService);
    const items = await wishlistService.getWishlist('user_1');

    expect(items).toHaveLength(2);
    expect(items[0].character.name).toBe('Aqua');
    expect(items[0].isForSale).toBe(true);
    expect(items[0].character.isForSale).toBe(true);

    expect(items[1].character.name).toBe('Megumin');
    expect(items[1].isForSale).toBe(false);
    expect(items[1].character.isForSale).toBe(false);
  });

  it('WishlistService.getWishlist deve sinalizar isMarriedToSelf corretamente', async () => {
    const mockPrisma: any = {
      wishlistEntry: {
        findMany: async () => [
          {
            id: 'wish_self',
            userId: 'my_user_id',
            isStarWish: false,
            addedAt: new Date(),
            character: {
              id: 'char_self',
              name: 'Asuna',
              series: 'SAO',
              baseRarity: 'LEGENDARY',
              imageUrls: ['asuna.jpg'],
              _count: { wishlists: 10 },
              marketListings: [],
              haremEntries: [{ user: { id: 'my_user_id', name: 'MyUser', publicId: 'my_pub' } }],
            },
          },
          {
            id: 'wish_other',
            userId: 'my_user_id',
            isStarWish: false,
            addedAt: new Date(),
            character: {
              id: 'char_other',
              name: 'Shinobu',
              series: 'Monogatari',
              baseRarity: 'EPIC',
              imageUrls: ['shinobu.jpg'],
              _count: { wishlists: 12 },
              marketListings: [],
              haremEntries: [{ user: { id: 'other_user_id', name: 'OtherUser', publicId: 'other_pub' } }],
            },
          },
        ],
      },
    };

    const mockCharService: any = {
      getRandomImageUrl: (_id: string, urls: string[]) => urls[0],
      formatImageUrl: (_id: string, img: string) => img,
    };

    const wishlistService = new WishlistService(mockPrisma, mockCharService);
    const items = await wishlistService.getWishlist('my_user_id');

    expect(items).toHaveLength(2);
    expect(items[0].isMarried).toBe(true);
    expect(items[0].isMarriedToSelf).toBe(true);
    expect(items[0].character.isMarriedToSelf).toBe(true);

    expect(items[1].isMarried).toBe(true);
    expect(items[1].isMarriedToSelf).toBe(false);
    expect(items[1].character.isMarriedToSelf).toBe(false);
  });

  it('WishlistService.clearMarried com onlySelf=true deve filtrar apenas casadas com o próprio usuário', async () => {
    let capturedWhere: any = null;
    let deletedWhere: any = null;

    const mockPrisma: any = {
      wishlistEntry: {
        findMany: async (args: any) => {
          capturedWhere = args.where;
          return [
            {
              id: 'wish_entry_1',
              character: { id: 'char_1', name: 'Rem' },
            },
          ];
        },
        deleteMany: async (args: any) => {
          deletedWhere = args.where;
          return { count: 1 };
        },
      },
    };

    const wishlistService = new WishlistService(mockPrisma, null as any);

    // 1. Teste com onlySelf = true
    const resultSelf = await wishlistService.clearMarried('user_123', true);
    expect(capturedWhere).toEqual({
      userId: 'user_123',
      character: {
        haremEntries: {
          some: { userId: 'user_123' },
        },
      },
    });
    expect(deletedWhere).toEqual({
      id: { in: ['wish_entry_1'] },
    });
    expect(resultSelf.success).toBe(true);
    expect(resultSelf.data.removedCount).toBe(1);
    expect(resultSelf.data.message).toContain('com você');

    // 2. Teste com onlySelf = false (todas as casadas)
    const resultAll = await wishlistService.clearMarried('user_123', false);
    expect(capturedWhere).toEqual({
      userId: 'user_123',
      character: {
        haremEntries: {
          some: {},
        },
      },
    });
    expect(resultAll.success).toBe(true);
    expect(resultAll.data.removedCount).toBe(1);
    expect(resultAll.data.message).not.toContain('com você');
  });

  it('MarketService.getUserSentOffers deve retornar todas as ofertas do usuário ordenadas por data desc sem trava de 15 dias', async () => {
    let capturedFindManyArgs: any = null;

    const mockPrisma: any = {
      marketOffer: {
        findMany: async (args: any) => {
          capturedFindManyArgs = args;
          return [
            {
              id: 'offer_new',
              buyerId: 'user_buyer_1',
              listingId: 'listing_1',
              createdAt: new Date('2026-11-09T18:00:00Z'),
              status: 'PENDING',
              offeredItems: { zinthos: 500 },
              listing: {
                id: 'listing_1',
                character: {
                  id: 'char_1',
                  name: 'Asuka',
                  series: 'Evangelion',
                  baseRarity: 'LEGENDARY',
                  imageUrls: ['asuka.png'],
                },
                user: { id: 'seller_1', name: 'Shinji', publicId: 'shinji_pub' },
              },
            },
            {
              id: 'offer_old',
              buyerId: 'user_buyer_1',
              listingId: 'listing_2',
              createdAt: new Date('2026-09-01T12:00:00Z'), // Mais de 60 dias atrás
              status: 'ACCEPTED',
              offeredItems: { isFree: true },
              listing: {
                id: 'listing_2',
                character: {
                  id: 'char_2',
                  name: 'Rei',
                  series: 'Evangelion',
                  baseRarity: 'RARE',
                  imageUrls: ['rei.png'],
                },
                user: { id: 'seller_2', name: 'Gendo', publicId: 'gendo_pub' },
              },
            },
          ];
        },
      },
    };

    const marketService = new MarketService(mockPrisma);
    const offers = await marketService.getUserSentOffers('user_buyer_1');

    // Valida que busca APENAS por buyerId sem restrição de data (sem createdAt: { gte: ... })
    expect(capturedFindManyArgs.where).toEqual({ buyerId: 'user_buyer_1' });
    expect(capturedFindManyArgs.orderBy).toEqual({ createdAt: 'desc' });

    // Valida que retornou todas as ofertas (incluindo a de 60 dias atrás)
    expect(offers).toHaveLength(2);
    expect(offers[0].id).toBe('offer_new');
    expect(offers[0].listing.character.name).toBe('Asuka');
    expect(offers[1].id).toBe('offer_old');
    expect(offers[1].listing.character.name).toBe('Rei');
  });
});
