CREATE TABLE IF NOT EXISTS "users" (
  "uid" UUID NOT NULL,
  "login" VARCHAR(64) NOT NULL,
  "phone" VARCHAR(10) NULL,
  "password" VARCHAR(255) NOT NULL,
  "firstName" VARCHAR(64) NOT NULL,
  "lastName" VARCHAR(64) NOT NULL,
  "surname" VARCHAR(64) NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMP NULL,
  PRIMARY KEY ("uid"),
  CONSTRAINT "users_login_unique" UNIQUE ("login")
);

CREATE TABLE IF NOT EXISTS "roles" (
  "uid" UUID NOT NULL,
  "name" VARCHAR(64) NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMP NULL,
  PRIMARY KEY ("uid"),
  CONSTRAINT "roles_name_unique" UNIQUE ("name")
);

CREATE TABLE IF NOT EXISTS "user_roles" (
  "uid" UUID NOT NULL,
  "userUid" UUID NOT NULL,
  "roleUid" UUID NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMP NULL,
  PRIMARY KEY ("uid"),
  CONSTRAINT "user_roles_user_role_unique" UNIQUE ("userUid", "roleUid")
);

CREATE INDEX IF NOT EXISTS "user_roles_role_uid_index" ON "user_roles" ("roleUid");

CREATE TABLE IF NOT EXISTS "stored_files" (
  "uid" UUID NOT NULL,
  "originalName" VARCHAR(255) NOT NULL,
  "mimeType" VARCHAR(120) NOT NULL,
  "size" INTEGER NOT NULL,
  "description" VARCHAR(500) NULL,
  "storagePath" VARCHAR(128) NOT NULL,
  "createdByUserUid" UUID NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMP NULL,
  PRIMARY KEY ("uid")
);

CREATE INDEX IF NOT EXISTS "stored_files_created_by_user_uid_index" ON "stored_files" ("createdByUserUid");

CREATE TABLE IF NOT EXISTS "chat_rooms" (
  "uid" UUID NOT NULL,
  "type" VARCHAR(32) NOT NULL,
  "title" VARCHAR(120) NOT NULL,
  "createdByUserUid" UUID NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMP NULL,
  PRIMARY KEY ("uid")
);

CREATE INDEX IF NOT EXISTS "chat_rooms_created_by_user_uid_index" ON "chat_rooms" ("createdByUserUid");

CREATE TABLE IF NOT EXISTS "chat_room_members" (
  "uid" UUID NOT NULL,
  "roomUid" UUID NOT NULL,
  "userUid" UUID NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMP NULL,
  PRIMARY KEY ("uid"),
  CONSTRAINT "chat_room_members_room_user_unique" UNIQUE ("roomUid", "userUid")
);

CREATE INDEX IF NOT EXISTS "chat_room_members_user_uid_index" ON "chat_room_members" ("userUid");

CREATE TABLE IF NOT EXISTS "chat_messages" (
  "uid" UUID NOT NULL,
  "roomUid" UUID NOT NULL,
  "senderUserUid" UUID NOT NULL,
  "text" TEXT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMP NULL,
  PRIMARY KEY ("uid")
);

CREATE INDEX IF NOT EXISTS "chat_messages_room_uid_index" ON "chat_messages" ("roomUid");
CREATE INDEX IF NOT EXISTS "chat_messages_sender_user_uid_index" ON "chat_messages" ("senderUserUid");

CREATE TABLE IF NOT EXISTS "chat_message_files" (
  "uid" UUID NOT NULL,
  "messageUid" UUID NOT NULL,
  "storedFileUid" UUID NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMP NULL,
  PRIMARY KEY ("uid")
);

CREATE INDEX IF NOT EXISTS "chat_message_files_message_uid_index" ON "chat_message_files" ("messageUid");
CREATE INDEX IF NOT EXISTS "chat_message_files_stored_file_uid_index" ON "chat_message_files" ("storedFileUid");
