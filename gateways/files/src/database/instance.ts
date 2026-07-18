import Sequelize, { Options, Sequelize as SequelizeClass } from "sequelize"
import { ChatMessageFileModel, getChatMessageFileModel } from "@/models/chat/ChatMessageFileModel"
import { ChatMessageModel } from "@/models/chat/ChatMessageModel"
import { ChatRoomMemberModel } from "@/models/chat/ChatRoomMemberModel"
import { ChatRoomModel } from "@/models/chat/ChatRoomModel"
import { getStoredFileFolderModel, StoredFileFolderModel } from "@/models/files/StoredFileFolderModel"
import { getStoredFileModel, StoredFileModel } from "@/models/files/StoredFileModel"
import { getStoredDocumentModel, StoredDocumentModel } from "@/models/files/StoredDocumentModel"
import { PermissionModel } from "@/models/users/PermissionModel"
import { RoleModel } from "@/models/users/RoleModel"
import { RolePermissionModel } from "@/models/users/RolePermissionModel"
import { UserRoleModel } from "@/models/users/UserRoleModel"
import { getUserModel, UserModel } from "@/models/users/UserModel"

export interface DataBaseInstance {
  Sequelize: typeof Sequelize
  sequelize: SequelizeClass
  models: iDatabase.Models
}

export interface iModels {
  User: typeof UserModel
  Role: typeof RoleModel
  Permission: typeof PermissionModel
  RolePermission: typeof RolePermissionModel
  UserRole: typeof UserRoleModel
  ChatRoom: typeof ChatRoomModel
  ChatRoomMember: typeof ChatRoomMemberModel
  ChatMessage: typeof ChatMessageModel
  ChatMessageFile: typeof ChatMessageFileModel
  StoredFileFolder: typeof StoredFileFolderModel
  StoredFile: typeof StoredFileModel
  StoredDocument: typeof StoredDocumentModel
}

export class Database {
  readonly Sequelize = Sequelize
  readonly sequelize: SequelizeClass
  readonly models: iDatabase.Models
  constructor(config: Options) {
    this.sequelize = new SequelizeClass(config)
    this.models = {
      User: getUserModel(this.sequelize),
      ChatMessageFile: getChatMessageFileModel(this.sequelize),
      StoredFileFolder: getStoredFileFolderModel(this.sequelize),
      StoredFile: getStoredFileModel(this.sequelize),
      StoredDocument: getStoredDocumentModel(this.sequelize)
    } as iDatabase.Models

    this.models.StoredFileFolder.associate(this.models)
    this.models.StoredFile.associate(this.models)
    this.models.StoredDocument.associate(this.models)
  }
}

export interface iDatabaseEnv {
  VAR_DB_DIALECT?: string
  VAR_DB_HOST: string
  VAR_DB_PORT?: string
  VAR_DB_NAME: string
  VAR_DB_USER: string
  VAR_DB_PASSWORD: string
}
