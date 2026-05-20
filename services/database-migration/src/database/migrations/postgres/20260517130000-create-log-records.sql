CREATE TABLE IF NOT EXISTS "log_records" (
  "uid" UUID NOT NULL,
  "timestamp" TIMESTAMP NOT NULL,
  "level" VARCHAR(16) NOT NULL,
  "source" VARCHAR(120) NOT NULL,
  "message" VARCHAR(500) NOT NULL,
  "context" JSONB NOT NULL,
  PRIMARY KEY ("uid")
);

CREATE INDEX IF NOT EXISTS "log_records_timestamp_index" ON "log_records" ("timestamp");
CREATE INDEX IF NOT EXISTS "log_records_level_index" ON "log_records" ("level");
CREATE INDEX IF NOT EXISTS "log_records_source_index" ON "log_records" ("source");
