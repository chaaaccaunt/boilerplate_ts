CREATE TABLE max_bot_configuration (
  uid CHAR(36) NOT NULL,
  token TEXT NOT NULL,
  botUsername VARCHAR(128) NOT NULL,
  createdAt DATETIME NOT NULL,
  updatedAt DATETIME NOT NULL,
  PRIMARY KEY (uid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
