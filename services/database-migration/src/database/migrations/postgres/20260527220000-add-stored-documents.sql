CREATE TABLE IF NOT EXISTS "stored_documents" (
  "uid" UUID NOT NULL,
  "title" VARCHAR(180) NOT NULL,
  "contentJson" TEXT NOT NULL,
  "contentHtml" TEXT NOT NULL,
  "folderUid" UUID NULL,
  "visibility" VARCHAR(16) NOT NULL DEFAULT 'public',
  "status" VARCHAR(16) NOT NULL DEFAULT 'draft',
  "finalizedAt" TIMESTAMP NULL,
  "createdByUserUid" UUID NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMP NULL,
  PRIMARY KEY ("uid")
);

CREATE INDEX IF NOT EXISTS "stored_documents_folder_uid_index" ON "stored_documents" ("folderUid");
CREATE INDEX IF NOT EXISTS "stored_documents_created_by_user_uid_index" ON "stored_documents" ("createdByUserUid");
CREATE INDEX IF NOT EXISTS "stored_documents_visibility_index" ON "stored_documents" ("visibility");
CREATE INDEX IF NOT EXISTS "stored_documents_status_index" ON "stored_documents" ("status");
