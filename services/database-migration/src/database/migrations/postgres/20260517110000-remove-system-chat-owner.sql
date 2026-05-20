UPDATE "chat_rooms"
SET "createdByUserUid" = NULL
WHERE "createdByUserUid" = '00000000-0000-4000-8000-000000000202';

DELETE FROM "users"
WHERE "uid" = '00000000-0000-4000-8000-000000000202'
  AND "login" = 'system@example.com';
