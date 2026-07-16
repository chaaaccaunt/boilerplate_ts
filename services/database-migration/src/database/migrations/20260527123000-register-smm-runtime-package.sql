INSERT INTO `runtime_packages` (`uid`, `name`, `createdAt`, `updatedAt`)
VALUES
  ('00000000-0000-4000-8000-000000000501', 'smm-service', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON DUPLICATE KEY UPDATE
  `name` = VALUES(`name`),
  `updatedAt` = CURRENT_TIMESTAMP;
