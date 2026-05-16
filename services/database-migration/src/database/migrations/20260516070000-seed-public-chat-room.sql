ALTER TABLE `chat_rooms`
  MODIFY COLUMN `createdByUserUid` CHAR(36) NULL;

INSERT INTO `chat_rooms` (
  `uid`,
  `type`,
  `title`,
  `createdByUserUid`,
  `createdAt`,
  `updatedAt`
)
VALUES (
  '00000000-0000-4000-8000-000000000001',
  'public',
  'Общий чат',
  NULL,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON DUPLICATE KEY UPDATE
  `type` = VALUES(`type`),
  `title` = VALUES(`title`),
  `deletedAt` = NULL,
  `updatedAt` = CURRENT_TIMESTAMP;
