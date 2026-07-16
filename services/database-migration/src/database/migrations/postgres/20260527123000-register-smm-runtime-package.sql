INSERT INTO "runtime_packages" ("uid", "name", "createdAt", "updatedAt")
VALUES
  ('00000000-0000-4000-8000-000000000501', 'smm-service', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("uid") DO UPDATE SET
  "name" = EXCLUDED."name",
  "updatedAt" = CURRENT_TIMESTAMP;
