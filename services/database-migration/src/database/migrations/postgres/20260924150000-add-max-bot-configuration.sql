CREATE TABLE max_bot_configuration (
  uid UUID PRIMARY KEY,
  token TEXT NOT NULL,
  "botUsername" VARCHAR(128) NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL,
  "updatedAt" TIMESTAMPTZ NOT NULL
);
