CREATE TABLE notifications (
  uid CHAR(36) NOT NULL,
  userUid CHAR(36) NOT NULL,
  kind VARCHAR(32) NOT NULL,
  title VARCHAR(160) NOT NULL,
  message TEXT NOT NULL,
  link VARCHAR(500) NULL,
  readAt DATETIME NULL,
  createdAt DATETIME NOT NULL,
  updatedAt DATETIME NOT NULL,
  PRIMARY KEY (uid),
  INDEX notifications_user_created_idx (userUid, createdAt),
  CONSTRAINT notifications_user_fk FOREIGN KEY (userUid) REFERENCES users(uid) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE max_accounts (
  uid CHAR(36) NOT NULL,
  userUid CHAR(36) NOT NULL,
  maxUserId VARCHAR(64) NOT NULL,
  maxChatId VARCHAR(64) NOT NULL,
  maxDisplayName VARCHAR(160) NULL,
  twoFactorEnabled BOOLEAN NOT NULL DEFAULT FALSE,
  createdAt DATETIME NOT NULL,
  updatedAt DATETIME NOT NULL,
  PRIMARY KEY (uid),
  UNIQUE KEY max_accounts_user_uid_unique (userUid),
  UNIQUE KEY max_accounts_max_user_id_unique (maxUserId),
  CONSTRAINT max_accounts_user_fk FOREIGN KEY (userUid) REFERENCES users(uid) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE notification_challenges (
  uid CHAR(36) NOT NULL,
  userUid CHAR(36) NOT NULL,
  purpose VARCHAR(32) NOT NULL,
  codeHash CHAR(64) NOT NULL,
  expiresAt DATETIME NOT NULL,
  attempts INT UNSIGNED NOT NULL DEFAULT 0,
  consumedAt DATETIME NULL,
  createdAt DATETIME NOT NULL,
  updatedAt DATETIME NOT NULL,
  PRIMARY KEY (uid),
  INDEX notification_challenges_lookup_idx (purpose, codeHash, expiresAt),
  CONSTRAINT notification_challenges_user_fk FOREIGN KEY (userUid) REFERENCES users(uid) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
