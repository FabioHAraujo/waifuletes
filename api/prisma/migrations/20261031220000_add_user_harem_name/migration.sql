-- AlterTable: Adicionar harem_name em users
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "harem_name" TEXT;
