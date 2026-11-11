-- AlterEnum
ALTER TYPE "KakeraReason" ADD VALUE IF NOT EXISTS 'HOSTING_FEE';
ALTER TYPE "KakeraReason" ADD VALUE IF NOT EXISTS 'HOSTING_FEE_WAIFU';

-- AlterTable
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_active_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "users_last_active_at_idx" ON "users"("last_active_at");

-- Inicializar last_active_at com updatedAt para registros existentes
UPDATE "users" SET "last_active_at" = "updatedAt" WHERE "last_active_at" IS NULL;
