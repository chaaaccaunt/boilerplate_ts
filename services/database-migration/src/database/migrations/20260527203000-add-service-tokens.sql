CREATE TABLE IF NOT EXISTS `service_tokens` (
  `uid` CHAR(36) NOT NULL,
  `type` VARCHAR(32) NOT NULL,
  `serviceName` VARCHAR(80) NOT NULL,
  `displayName` VARCHAR(120) NOT NULL,
  `encryptedToken` TEXT NOT NULL,
  `tokenIv` VARCHAR(64) NOT NULL,
  `tokenAuthTag` VARCHAR(64) NOT NULL,
  `tokenPreview` VARCHAR(32) NOT NULL,
  `isEnabled` TINYINT(1) NOT NULL DEFAULT 1,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`uid`),
  UNIQUE KEY `service_tokens_type_name_unique` (`type`, `serviceName`)
);
