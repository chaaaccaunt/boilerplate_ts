INSERT INTO "runtime_packages" ("uid", "name", "createdAt", "updatedAt")
VALUES ('00000000-0000-4000-8000-000000000408', 'notifications-service', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("name") DO UPDATE SET
  "uid" = EXCLUDED."uid",
  "updatedAt" = CURRENT_TIMESTAMP;
