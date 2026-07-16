CREATE TABLE IF NOT EXISTS `runtime_packages` (
  `uid` CHAR(36) NOT NULL,
  `name` VARCHAR(120) NOT NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`uid`),
  UNIQUE KEY `runtime_packages_name_unique` (`name`)
);

INSERT INTO `runtime_packages` (`uid`, `name`, `createdAt`, `updatedAt`)
VALUES
  ('00000000-0000-4000-8000-000000000401', 'log-collector-service', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('00000000-0000-4000-8000-000000000402', 'users-service', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('00000000-0000-4000-8000-000000000403', 'chat-service', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('00000000-0000-4000-8000-000000000404', 'authorization-gateway', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('00000000-0000-4000-8000-000000000405', 'public-gateway', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('00000000-0000-4000-8000-000000000406', 'files-gateway', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('00000000-0000-4000-8000-000000000407', 'chat-realtime-gateway', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('00000000-0000-4000-8000-000000000501', 'smm-service', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON DUPLICATE KEY UPDATE
  `name` = VALUES(`name`),
  `updatedAt` = CURRENT_TIMESTAMP;

CREATE TABLE IF NOT EXISTS `runtime_package_connections` (
  `uid` CHAR(36) NOT NULL,
  `packageUid` CHAR(36) NOT NULL,
  `event` ENUM('connected', 'disconnected') NOT NULL,
  `timestamp` DATETIME NOT NULL,
  `details` JSON NOT NULL,
  PRIMARY KEY (`uid`),
  KEY `runtime_package_connections_package_uid_index` (`packageUid`),
  KEY `runtime_package_connections_timestamp_index` (`timestamp`),
  CONSTRAINT `runtime_package_connections_package_uid_fk`
    FOREIGN KEY (`packageUid`) REFERENCES `runtime_packages` (`uid`)
);

ALTER TABLE `log_records`
  ADD COLUMN `packageUid` CHAR(36) NULL AFTER `uid`;

UPDATE `log_records`
SET `packageUid` = '00000000-0000-4000-8000-000000000401'
WHERE `packageUid` IS NULL;

ALTER TABLE `log_records`
  MODIFY COLUMN `packageUid` CHAR(36) NOT NULL,
  ADD KEY `log_records_package_uid_index` (`packageUid`),
  ADD CONSTRAINT `log_records_package_uid_fk`
    FOREIGN KEY (`packageUid`) REFERENCES `runtime_packages` (`uid`);

CREATE TABLE IF NOT EXISTS `user_sessions` (
  `uid` CHAR(36) NOT NULL,
  `userUid` CHAR(36) NOT NULL,
  `ipAddress` VARCHAR(64) NULL,
  `userAgent` VARCHAR(500) NOT NULL,
  `deviceType` VARCHAR(32) NOT NULL,
  `operatingSystem` VARCHAR(80) NOT NULL,
  `browser` VARCHAR(80) NOT NULL,
  `lastSeenAt` DATETIME NOT NULL,
  `revokedAt` DATETIME NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`uid`),
  KEY `user_sessions_user_uid_index` (`userUid`),
  KEY `user_sessions_revoked_at_index` (`revokedAt`)
);
