CREATE TABLE IF NOT EXISTS `stored_documents` (
  `uid` CHAR(36) NOT NULL,
  `title` VARCHAR(180) NOT NULL,
  `contentJson` LONGTEXT NOT NULL,
  `contentHtml` LONGTEXT NOT NULL,
  `folderUid` CHAR(36) NULL,
  `visibility` ENUM('public', 'private') NOT NULL DEFAULT 'public',
  `status` ENUM('draft', 'final') NOT NULL DEFAULT 'draft',
  `finalizedAt` DATETIME NULL,
  `createdByUserUid` CHAR(36) NOT NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deletedAt` DATETIME NULL,
  PRIMARY KEY (`uid`),
  KEY `stored_documents_folder_uid_index` (`folderUid`),
  KEY `stored_documents_created_by_user_uid_index` (`createdByUserUid`),
  KEY `stored_documents_visibility_index` (`visibility`),
  KEY `stored_documents_status_index` (`status`)
);
