ALTER TABLE `log_records`
  ADD COLUMN `kind` ENUM('application', 'collector_connection', 'collector_disconnection') NOT NULL DEFAULT 'application' AFTER `timestamp`,
  ADD KEY `log_records_kind_index` (`kind`);

