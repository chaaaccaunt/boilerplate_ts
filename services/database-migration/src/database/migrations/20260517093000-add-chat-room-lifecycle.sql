ALTER TABLE `chat_rooms`
  ADD COLUMN `status` ENUM('active', 'archived_by_owner', 'orphaned') NOT NULL DEFAULT 'active' AFTER `type`,
  ADD COLUMN `archivedAt` DATETIME NULL AFTER `title`;

ALTER TABLE `chat_room_members`
  ADD COLUMN `leftAt` DATETIME NULL AFTER `userUid`;

CREATE INDEX `chat_rooms_status_index` ON `chat_rooms` (`status`);
CREATE INDEX `chat_room_members_room_left_at_index` ON `chat_room_members` (`roomUid`, `leftAt`);

INSERT INTO `users` (
  `uid`,
  `login`,
  `password`,
  `firstName`,
  `lastName`,
  `surname`,
  `createdAt`,
  `updatedAt`
)
VALUES (
  '00000000-0000-4000-8000-000000000202',
  'system@example.com',
  '$2b$10$9Srrg0qhRsHjC5YFbw8wYukfownKqxKgtF48VDErFBeXBpTfR9ixK',
  'Система',
  'Системный',
  NULL,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON DUPLICATE KEY UPDATE
  `firstName` = VALUES(`firstName`),
  `lastName` = VALUES(`lastName`),
  `surname` = VALUES(`surname`),
  `deletedAt` = NULL,
  `updatedAt` = CURRENT_TIMESTAMP;

