ALTER TABLE "log_records"
  ADD COLUMN IF NOT EXISTS "kind" VARCHAR(64) NOT NULL DEFAULT 'application';

CREATE INDEX IF NOT EXISTS "log_records_kind_index" ON "log_records" ("kind");
