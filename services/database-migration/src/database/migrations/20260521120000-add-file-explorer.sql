CREATE TABLE IF NOT EXISTS `stored_file_folders` (
  `uid` CHAR(36) NOT NULL,
  `title` VARCHAR(120) NOT NULL,
  `parentFolderUid` CHAR(36) NULL,
  `visibility` ENUM('public', 'private') NOT NULL DEFAULT 'public',
  `createdByUserUid` CHAR(36) NOT NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deletedAt` DATETIME NULL,
  PRIMARY KEY (`uid`),
  KEY `stored_file_folders_parent_folder_uid_index` (`parentFolderUid`),
  KEY `stored_file_folders_created_by_user_uid_index` (`createdByUserUid`)
);

ALTER TABLE `stored_files`
  ADD COLUMN `folderUid` CHAR(36) NULL,
  ADD COLUMN `visibility` ENUM('public', 'private') NOT NULL DEFAULT 'public';

CREATE INDEX `stored_files_folder_uid_index` ON `stored_files` (`folderUid`);
CREATE INDEX `stored_files_visibility_index` ON `stored_files` (`visibility`);
