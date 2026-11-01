-- AlterTable
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "harem_private" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "user_collections" ADD COLUMN IF NOT EXISTS "is_private" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "user_collections" ADD COLUMN IF NOT EXISTS "position" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "harem_entries" ADD COLUMN IF NOT EXISTS "pinned_photo" TEXT;

-- Backfill: posição inicial das coleções por data de criação (por usuário)
UPDATE "user_collections" uc
SET "position" = sub.rn
FROM (
  SELECT "id", ROW_NUMBER() OVER (PARTITION BY "user_id" ORDER BY "created_at" ASC) AS rn
  FROM "user_collections"
) sub
WHERE uc."id" = sub."id";
