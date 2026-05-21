CREATE TABLE IF NOT EXISTS "runtime_packages" (
  "uid" UUID NOT NULL,
  "name" VARCHAR(120) NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("uid"),
  CONSTRAINT "runtime_packages_name_unique" UNIQUE ("name")
);

INSERT INTO "runtime_packages" ("uid", "name", "createdAt", "updatedAt")
VALUES
  ('00000000-0000-4000-8000-000000000401', 'log-collector-service', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('00000000-0000-4000-8000-000000000402', 'users-service', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('00000000-0000-4000-8000-000000000403', 'chat-service', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('00000000-0000-4000-8000-000000000404', 'authorization-gateway', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('00000000-0000-4000-8000-000000000405', 'public-gateway', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('00000000-0000-4000-8000-000000000406', 'files-gateway', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('00000000-0000-4000-8000-000000000407', 'chat-realtime-gateway', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("name") DO UPDATE SET
  "uid" = EXCLUDED."uid",
  "updatedAt" = CURRENT_TIMESTAMP;

CREATE TABLE IF NOT EXISTS "runtime_package_connections" (
  "uid" UUID NOT NULL,
  "packageUid" UUID NOT NULL,
  "event" VARCHAR(32) NOT NULL,
  "timestamp" TIMESTAMP NOT NULL,
  "details" JSONB NOT NULL,
  PRIMARY KEY ("uid"),
  CONSTRAINT "runtime_package_connections_package_uid_fk"
    FOREIGN KEY ("packageUid") REFERENCES "runtime_packages" ("uid")
);

CREATE INDEX IF NOT EXISTS "runtime_package_connections_package_uid_index" ON "runtime_package_connections" ("packageUid");
CREATE INDEX IF NOT EXISTS "runtime_package_connections_timestamp_index" ON "runtime_package_connections" ("timestamp");

ALTER TABLE "log_records"
  ADD COLUMN IF NOT EXISTS "packageUid" UUID;

UPDATE "log_records"
SET "packageUid" = '00000000-0000-4000-8000-000000000401'
WHERE "packageUid" IS NULL;

ALTER TABLE "log_records"
  ALTER COLUMN "packageUid" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "log_records_package_uid_index" ON "log_records" ("packageUid");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'log_records_package_uid_fk'
      AND table_name = 'log_records'
  ) THEN
    ALTER TABLE "log_records"
      ADD CONSTRAINT "log_records_package_uid_fk"
      FOREIGN KEY ("packageUid") REFERENCES "runtime_packages" ("uid");
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "user_sessions" (
  "uid" UUID NOT NULL,
  "userUid" UUID NOT NULL,
  "ipAddress" VARCHAR(64) NULL,
  "userAgent" VARCHAR(500) NOT NULL,
  "deviceType" VARCHAR(32) NOT NULL,
  "operatingSystem" VARCHAR(80) NOT NULL,
  "browser" VARCHAR(80) NOT NULL,
  "lastSeenAt" TIMESTAMP NOT NULL,
  "revokedAt" TIMESTAMP NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("uid")
);

CREATE INDEX IF NOT EXISTS "user_sessions_user_uid_index" ON "user_sessions" ("userUid");
CREATE INDEX IF NOT EXISTS "user_sessions_revoked_at_index" ON "user_sessions" ("revokedAt");
