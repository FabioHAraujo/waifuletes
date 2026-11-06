-- Cleanup de dados órfãos: anúncios ACTIVE de personagens que o vendedor não possui mais
-- (divórcios antigos não encerravam o anúncio nos classificados)

-- 1. Cancela as ofertas pendentes dos anúncios órfãos (avisa o comprador no próximo roll)
UPDATE "market_offers" o
SET "status" = 'CANCELLED'::"OfferStatus",
    "cancelReason" = 'O anúncio foi encerrado: o vendedor não possui mais este personagem.',
    "notifiedBuyer" = false,
    "buyerNotifiedStatus" = 'CANCELLED',
    "updatedAt" = now()
WHERE o."status" = 'PENDING'::"OfferStatus"
  AND EXISTS (
    SELECT 1
    FROM "market_listings" l
    WHERE l."id" = o."listingId"
      AND l."status" = 'ACTIVE'::"ListingStatus"
      AND NOT EXISTS (
        SELECT 1
        FROM "harem_entries" h
        WHERE h."userId" = l."userId"
          AND h."characterId" = l."characterId"
      )
  );

-- 2. Remove dos classificados os anúncios órfãos (histórico preservado como CANCELLED)
UPDATE "market_listings" l
SET "status" = 'CANCELLED'::"ListingStatus",
    "updatedAt" = now()
WHERE l."status" = 'ACTIVE'::"ListingStatus"
  AND NOT EXISTS (
    SELECT 1
    FROM "harem_entries" h
    WHERE h."userId" = l."userId"
      AND h."characterId" = l."characterId"
  );
