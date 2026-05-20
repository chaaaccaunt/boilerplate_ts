ALTER TABLE "chat_rooms"
  ADD COLUMN IF NOT EXISTS "status" VARCHAR(32) NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP NULL;

ALTER TABLE "chat_room_members"
  ADD COLUMN IF NOT EXISTS "leftAt" TIMESTAMP NULL;

CREATE INDEX IF NOT EXISTS "chat_rooms_status_index" ON "chat_rooms" ("status");
CREATE INDEX IF NOT EXISTS "chat_room_members_room_left_at_index" ON "chat_room_members" ("roomUid", "leftAt");
