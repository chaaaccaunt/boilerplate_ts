ALTER TABLE `chat_rooms`
  ADD COLUMN `status` ENUM('active', 'archived_by_owner', 'orphaned') NOT NULL DEFAULT 'active' AFTER `type`,
  ADD COLUMN `archivedAt` DATETIME NULL AFTER `title`;

ALTER TABLE `chat_room_members`
  ADD COLUMN `leftAt` DATETIME NULL AFTER `userUid`;

CREATE INDEX `chat_rooms_status_index` ON `chat_rooms` (`status`);
CREATE INDEX `chat_room_members_room_left_at_index` ON `chat_room_members` (`roomUid`, `leftAt`);
