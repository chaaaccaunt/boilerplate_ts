import Sequelize, { Options, Sequelize as SequelizeClass } from "sequelize"
import { ChatMessageFileModel, getChatMessageFileModel } from "@/models/chat/ChatMessageFileModel"
import { ChatMessageModel, getChatMessageModel } from "@/models/chat/ChatMessageModel"
import { ChatRoomMemberModel, getChatRoomMemberModel } from "@/models/chat/ChatRoomMemberModel"
import { ChatRoomModel, getChatRoomModel } from "@/models/chat/ChatRoomModel"
import { getStoredFileFolderModel, StoredFileFolderModel } from "@/models/files/StoredFileFolderModel"
import { getStoredFileModel, StoredFileModel } from "@/models/files/StoredFileModel"
import { getStoredDocumentModel, StoredDocumentModel } from "@/models/files/StoredDocumentModel"
import { getPermissionModel, PermissionModel } from "@/models/users/PermissionModel"
import { getRoleModel, RoleModel } from "@/models/users/RoleModel"
import { getRolePermissionModel, RolePermissionModel } from "@/models/users/RolePermissionModel"
import { getUserRoleModel, UserRoleModel } from "@/models/users/UserRoleModel"
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
      Role: getRoleModel(this.sequelize),
      Permission: getPermissionModel(this.sequelize),
      RolePermission: getRolePermissionModel(this.sequelize),
      UserRole: getUserRoleModel(this.sequelize),
      ChatRoom: getChatRoomModel(this.sequelize),
      ChatRoomMember: getChatRoomMemberModel(this.sequelize),
      ChatMessage: getChatMessageModel(this.sequelize),
      ChatMessageFile: getChatMessageFileModel(this.sequelize),
      StoredFileFolder: getStoredFileFolderModel(this.sequelize),
      StoredFile: getStoredFileModel(this.sequelize),
      StoredDocument: getStoredDocumentModel(this.sequelize)
    }

    Object.keys(this.models).forEach((key) => {
      this.models[key as keyof typeof this.models].associate(this.models)
    })
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
