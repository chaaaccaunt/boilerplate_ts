CREATE TABLE IF NOT EXISTS `log_records` (
  `uid` CHAR(36) NOT NULL,
  `timestamp` DATETIME NOT NULL,
  `level` ENUM('debug', 'info', 'warn', 'error') NOT NULL,
  `source` VARCHAR(120) NOT NULL,
  `message` VARCHAR(500) NOT NULL,
  `context` JSON NOT NULL,
  PRIMARY KEY (`uid`),
  KEY `log_records_timestamp_index` (`timestamp`),
  KEY `log_records_level_index` (`level`),
  KEY `log_records_source_index` (`source`)
);
