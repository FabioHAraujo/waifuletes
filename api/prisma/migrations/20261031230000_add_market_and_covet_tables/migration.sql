-- CreateEnums
DO $$ BEGIN
    CREATE TYPE "ListingStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "OfferStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "CovetStatus" AS ENUM ('PENDING', 'SEEN', 'IGNORED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateTable: character_covets
CREATE TABLE IF NOT EXISTS "character_covets" (
    "id" TEXT NOT NULL,
    "character_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "status" "CovetStatus" NOT NULL DEFAULT 'PENDING',
    "notified_owner" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "character_covets_pkey" PRIMARY KEY ("id")
);

-- CreateTable: market_listings
CREATE TABLE IF NOT EXISTS "market_listings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "interest" TEXT NOT NULL,
    "status" "ListingStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "market_listings_pkey" PRIMARY KEY ("id")
);

-- CreateTable: market_offers
CREATE TABLE IF NOT EXISTS "market_offers" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "message" TEXT,
    "offeredItems" JSONB NOT NULL,
    "status" "OfferStatus" NOT NULL DEFAULT 'PENDING',
    "cancelReason" TEXT,
    "notifiedSeller" BOOLEAN NOT NULL DEFAULT false,
    "notifiedBuyer" BOOLEAN NOT NULL DEFAULT false,
    "buyerNotifiedStatus" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "market_offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable: market_listing_notifications
CREATE TABLE IF NOT EXISTS "market_listing_notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "listing_id" TEXT NOT NULL,
    "character_id" TEXT NOT NULL,
    "notified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "market_listing_notifications_pkey" PRIMARY KEY ("id")
);

-- Indexes for character_covets
CREATE INDEX IF NOT EXISTS "character_covets_character_id_idx" ON "character_covets"("character_id");
CREATE UNIQUE INDEX IF NOT EXISTS "character_covets_character_id_user_id_key" ON "character_covets"("character_id", "user_id");
CREATE INDEX IF NOT EXISTS "character_covets_owner_id_notified_owner_idx" ON "character_covets"("owner_id", "notified_owner");
CREATE INDEX IF NOT EXISTS "character_covets_owner_id_status_idx" ON "character_covets"("owner_id", "status");

-- Indexes for market_listings
CREATE INDEX IF NOT EXISTS "market_listings_characterId_idx" ON "market_listings"("characterId");
CREATE INDEX IF NOT EXISTS "market_listings_status_createdAt_idx" ON "market_listings"("status", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "market_listings_userId_status_idx" ON "market_listings"("userId", "status");

-- Indexes for market_offers
CREATE INDEX IF NOT EXISTS "market_offers_buyerId_status_createdAt_idx" ON "market_offers"("buyerId", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "market_offers_listingId_status_idx" ON "market_offers"("listingId", "status");
CREATE INDEX IF NOT EXISTS "market_offers_sellerId_status_createdAt_idx" ON "market_offers"("sellerId", "status", "createdAt");

-- Indexes for market_listing_notifications
CREATE UNIQUE INDEX IF NOT EXISTS "market_listing_notifications_listing_id_user_id_key" ON "market_listing_notifications"("listing_id", "user_id");
CREATE INDEX IF NOT EXISTS "market_listing_notifications_user_id_notified_idx" ON "market_listing_notifications"("user_id", "notified");

-- Foreign keys for character_covets
ALTER TABLE "character_covets" DROP CONSTRAINT IF EXISTS "character_covets_character_id_fkey";
ALTER TABLE "character_covets" ADD CONSTRAINT "character_covets_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "character_covets" DROP CONSTRAINT IF EXISTS "character_covets_owner_id_fkey";
ALTER TABLE "character_covets" ADD CONSTRAINT "character_covets_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "character_covets" DROP CONSTRAINT IF EXISTS "character_covets_user_id_fkey";
ALTER TABLE "character_covets" ADD CONSTRAINT "character_covets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Foreign keys for market_listings
ALTER TABLE "market_listings" DROP CONSTRAINT IF EXISTS "market_listings_characterId_fkey";
ALTER TABLE "market_listings" ADD CONSTRAINT "market_listings_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "market_listings" DROP CONSTRAINT IF EXISTS "market_listings_userId_fkey";
ALTER TABLE "market_listings" ADD CONSTRAINT "market_listings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Foreign keys for market_offers
ALTER TABLE "market_offers" DROP CONSTRAINT IF EXISTS "market_offers_buyerId_fkey";
ALTER TABLE "market_offers" ADD CONSTRAINT "market_offers_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "market_offers" DROP CONSTRAINT IF EXISTS "market_offers_listingId_fkey";
ALTER TABLE "market_offers" ADD CONSTRAINT "market_offers_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "market_listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "market_offers" DROP CONSTRAINT IF EXISTS "market_offers_sellerId_fkey";
ALTER TABLE "market_offers" ADD CONSTRAINT "market_offers_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Foreign keys for market_listing_notifications
ALTER TABLE "market_listing_notifications" DROP CONSTRAINT IF EXISTS "market_listing_notifications_character_id_fkey";
ALTER TABLE "market_listing_notifications" ADD CONSTRAINT "market_listing_notifications_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "market_listing_notifications" DROP CONSTRAINT IF EXISTS "market_listing_notifications_listing_id_fkey";
ALTER TABLE "market_listing_notifications" ADD CONSTRAINT "market_listing_notifications_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "market_listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "market_listing_notifications" DROP CONSTRAINT IF EXISTS "market_listing_notifications_user_id_fkey";
ALTER TABLE "market_listing_notifications" ADD CONSTRAINT "market_listing_notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
