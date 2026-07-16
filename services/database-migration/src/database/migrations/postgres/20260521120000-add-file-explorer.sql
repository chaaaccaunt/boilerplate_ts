CREATE TABLE IF NOT EXISTS "stored_file_folders" (
  "uid" UUID NOT NULL,
  "title" VARCHAR(120) NOT NULL,
  "parentFolderUid" UUID NULL,
  "visibility" VARCHAR(16) NOT NULL DEFAULT 'public',
  "createdByUserUid" UUID NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMP NULL,
  PRIMARY KEY ("uid")
);

CREATE INDEX IF NOT EXISTS "stored_file_folders_parent_folder_uid_index" ON "stored_file_folders" ("parentFolderUid");
CREATE INDEX IF NOT EXISTS "stored_file_folders_created_by_user_uid_index" ON "stored_file_folders" ("createdByUserUid");

ALTER TABLE "stored_files"
  ADD COLUMN IF NOT EXISTS "folderUid" UUID NULL,
  ADD COLUMN IF NOT EXISTS "visibility" VARCHAR(16) NOT NULL DEFAULT 'public';

CREATE INDEX IF NOT EXISTS "stored_files_folder_uid_index" ON "stored_files" ("folderUid");
CREATE INDEX IF NOT EXISTS "stored_files_visibility_index" ON "stored_files" ("visibility");
