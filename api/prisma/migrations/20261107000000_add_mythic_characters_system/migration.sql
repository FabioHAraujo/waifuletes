-- AlterTable
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "mythic_slots" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "characters" ADD COLUMN IF NOT EXISTS "is_mythic" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "characters" ADD COLUMN IF NOT EXISTS "creator_user_id" TEXT;
ALTER TABLE "characters" ADD COLUMN IF NOT EXISTS "mythic_customization" JSONB;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "characters_is_mythic_idx" ON "characters"("is_mythic");
CREATE INDEX IF NOT EXISTS "characters_creator_user_id_idx" ON "characters"("creator_user_id");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'characters_creator_user_id_fkey'
  ) THEN
    ALTER TABLE "characters" ADD CONSTRAINT "characters_creator_user_id_fkey" FOREIGN KEY ("creator_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
