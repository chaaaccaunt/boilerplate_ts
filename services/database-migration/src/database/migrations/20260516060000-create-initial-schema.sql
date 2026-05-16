CREATE TABLE IF NOT EXISTS `users` (
  `uid` CHAR(36) NOT NULL,
  `login` VARCHAR(64) NOT NULL,
  `phone` VARCHAR(10) NULL,
  `password` VARCHAR(255) NOT NULL,
  `firstName` VARCHAR(64) NOT NULL,
  `lastName` VARCHAR(64) NOT NULL,
  `surname` VARCHAR(64) NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deletedAt` DATETIME NULL,
  PRIMARY KEY (`uid`),
  UNIQUE KEY `users_login_unique` (`login`)
);

CREATE TABLE IF NOT EXISTS `roles` (
  `uid` CHAR(36) NOT NULL,
  `name` VARCHAR(64) NOT NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deletedAt` DATETIME NULL,
  PRIMARY KEY (`uid`),
  UNIQUE KEY `roles_name_unique` (`name`)
);

CREATE TABLE IF NOT EXISTS `user_roles` (
  `uid` CHAR(36) NOT NULL,
  `userUid` CHAR(36) NOT NULL,
  `roleUid` CHAR(36) NOT NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deletedAt` DATETIME NULL,
  PRIMARY KEY (`uid`),
  UNIQUE KEY `user_roles_user_role_unique` (`userUid`, `roleUid`),
  KEY `user_roles_role_uid_index` (`roleUid`)
);

CREATE TABLE IF NOT EXISTS `stored_files` (
  `uid` CHAR(36) NOT NULL,
  `originalName` VARCHAR(255) NOT NULL,
  `mimeType` VARCHAR(120) NOT NULL,
  `size` INT UNSIGNED NOT NULL,
  `description` VARCHAR(500) NULL,
  `storagePath` VARCHAR(128) NOT NULL,
  `createdByUserUid` CHAR(36) NOT NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deletedAt` DATETIME NULL,
  PRIMARY KEY (`uid`),
  KEY `stored_files_created_by_user_uid_index` (`createdByUserUid`)
);

CREATE TABLE IF NOT EXISTS `chat_rooms` (
  `uid` CHAR(36) NOT NULL,
  `type` ENUM('public', 'group', 'private') NOT NULL,
  `title` VARCHAR(120) NOT NULL,
  `createdByUserUid` CHAR(36) NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deletedAt` DATETIME NULL,
  PRIMARY KEY (`uid`),
  KEY `chat_rooms_created_by_user_uid_index` (`createdByUserUid`)
);

CREATE TABLE IF NOT EXISTS `chat_room_members` (
  `uid` CHAR(36) NOT NULL,
  `roomUid` CHAR(36) NOT NULL,
  `userUid` CHAR(36) NOT NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deletedAt` DATETIME NULL,
  PRIMARY KEY (`uid`),
  UNIQUE KEY `chat_room_members_room_user_unique` (`roomUid`, `userUid`),
  KEY `chat_room_members_user_uid_index` (`userUid`)
);

CREATE TABLE IF NOT EXISTS `chat_messages` (
  `uid` CHAR(36) NOT NULL,
  `roomUid` CHAR(36) NOT NULL,
  `senderUserUid` CHAR(36) NOT NULL,
  `text` TEXT NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deletedAt` DATETIME NULL,
  PRIMARY KEY (`uid`),
  KEY `chat_messages_room_uid_index` (`roomUid`),
  KEY `chat_messages_sender_user_uid_index` (`senderUserUid`)
);

CREATE TABLE IF NOT EXISTS `chat_message_files` (
  `uid` CHAR(36) NOT NULL,
  `messageUid` CHAR(36) NOT NULL,
  `storedFileUid` CHAR(36) NOT NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deletedAt` DATETIME NULL,
  PRIMARY KEY (`uid`),
  KEY `chat_message_files_message_uid_index` (`messageUid`),
  KEY `chat_message_files_stored_file_uid_index` (`storedFileUid`)
);
