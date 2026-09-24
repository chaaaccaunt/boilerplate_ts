CREATE TABLE notifications (
  uid UUID PRIMARY KEY,
  "userUid" UUID NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
  kind VARCHAR(32) NOT NULL,
  title VARCHAR(160) NOT NULL,
  message TEXT NOT NULL,
  link VARCHAR(500),
  "readAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL,
  "updatedAt" TIMESTAMPTZ NOT NULL
);
CREATE INDEX notifications_user_created_idx ON notifications ("userUid", "createdAt");

CREATE TABLE max_accounts (
  uid UUID PRIMARY KEY,
  "userUid" UUID NOT NULL UNIQUE REFERENCES users(uid) ON DELETE CASCADE,
  "maxUserId" VARCHAR(64) NOT NULL UNIQUE,
  "maxChatId" VARCHAR(64) NOT NULL,
  "maxDisplayName" VARCHAR(160),
  "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt" TIMESTAMPTZ NOT NULL,
  "updatedAt" TIMESTAMPTZ NOT NULL
);

CREATE TABLE notification_challenges (
  uid UUID PRIMARY KEY,
  "userUid" UUID NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
  purpose VARCHAR(32) NOT NULL,
  "codeHash" CHAR(64) NOT NULL,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  "consumedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL,
  "updatedAt" TIMESTAMPTZ NOT NULL
);
CREATE INDEX notification_challenges_lookup_idx ON notification_challenges (purpose, "codeHash", "expiresAt");
