CREATE TABLE IF NOT EXISTS "service_tokens" (
  "uid" UUID NOT NULL,
  "type" VARCHAR(32) NOT NULL,
  "serviceName" VARCHAR(80) NOT NULL,
  "displayName" VARCHAR(120) NOT NULL,
  "encryptedToken" TEXT NOT NULL,
  "tokenIv" VARCHAR(64) NOT NULL,
  "tokenAuthTag" VARCHAR(64) NOT NULL,
  "tokenPreview" VARCHAR(32) NOT NULL,
  "isEnabled" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("uid"),
  CONSTRAINT "service_tokens_type_name_unique" UNIQUE ("type", "serviceName")
);
