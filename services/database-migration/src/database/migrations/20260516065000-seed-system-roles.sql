INSERT INTO `roles` (
  `uid`,
  `name`,
  `createdAt`,
  `updatedAt`
)
VALUES
  (
    '00000000-0000-4000-8000-000000000101',
    'superadministrator',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  )
ON DUPLICATE KEY UPDATE
  `name` = VALUES(`name`),
  `deletedAt` = NULL,
  `updatedAt` = CURRENT_TIMESTAMP;
