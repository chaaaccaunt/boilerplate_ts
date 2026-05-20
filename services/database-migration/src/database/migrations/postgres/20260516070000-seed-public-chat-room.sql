ALTER TABLE "chat_rooms"
  ALTER COLUMN "createdByUserUid" DROP NOT NULL;

INSERT INTO "chat_rooms" (
  "uid",
  "type",
  "title",
  "createdByUserUid",
  "createdAt",
  "updatedAt"
)
VALUES (
  '00000000-0000-4000-8000-000000000001',
  'public',
  'Общий чат',
  NULL,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("uid") DO UPDATE SET
  "type" = EXCLUDED."type",
  "title" = EXCLUDED."title",
  "deletedAt" = NULL,
  "updatedAt" = CURRENT_TIMESTAMP;
