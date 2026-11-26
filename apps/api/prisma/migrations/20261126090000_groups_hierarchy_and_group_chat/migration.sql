-- AlterTable
ALTER TABLE "groups"
  ADD COLUMN IF NOT EXISTS "image_url" TEXT,
  ADD COLUMN IF NOT EXISTS "chat_conversation_id" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "network_list_memberships" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "list_id" UUID NOT NULL,
  "contact_id" UUID NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "network_list_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "group_linked_circles" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "group_id" UUID NOT NULL,
  "circle_id" UUID NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "group_linked_circles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "network_list_memberships_list_id_idx" ON "network_list_memberships"("list_id");
CREATE INDEX IF NOT EXISTS "network_list_memberships_contact_id_idx" ON "network_list_memberships"("contact_id");
CREATE UNIQUE INDEX IF NOT EXISTS "network_list_memberships_list_id_contact_id_key" ON "network_list_memberships"("list_id", "contact_id");

CREATE INDEX IF NOT EXISTS "group_linked_circles_group_id_idx" ON "group_linked_circles"("group_id");
CREATE INDEX IF NOT EXISTS "group_linked_circles_circle_id_idx" ON "group_linked_circles"("circle_id");
CREATE UNIQUE INDEX IF NOT EXISTS "group_linked_circles_group_id_circle_id_key" ON "group_linked_circles"("group_id", "circle_id");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'network_list_memberships_list_id_fkey'
  ) THEN
    ALTER TABLE "network_list_memberships"
      ADD CONSTRAINT "network_list_memberships_list_id_fkey"
      FOREIGN KEY ("list_id") REFERENCES "network_lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'network_list_memberships_contact_id_fkey'
  ) THEN
    ALTER TABLE "network_list_memberships"
      ADD CONSTRAINT "network_list_memberships_contact_id_fkey"
      FOREIGN KEY ("contact_id") REFERENCES "network_contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'group_linked_circles_group_id_fkey'
  ) THEN
    ALTER TABLE "group_linked_circles"
      ADD CONSTRAINT "group_linked_circles_group_id_fkey"
      FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'group_linked_circles_circle_id_fkey'
  ) THEN
    ALTER TABLE "group_linked_circles"
      ADD CONSTRAINT "group_linked_circles_circle_id_fkey"
      FOREIGN KEY ("circle_id") REFERENCES "circles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Backfill existing single-list contacts into network_list_memberships
INSERT INTO "network_list_memberships" ("list_id", "contact_id")
SELECT "list_id", "id"
FROM "network_contacts"
ON CONFLICT ("list_id", "contact_id") DO NOTHING;
