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
});
