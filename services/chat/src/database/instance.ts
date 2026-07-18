import Sequelize, { Options, Sequelize as SequelizeClass } from "sequelize"
import { ChatMessageFileModel, getChatMessageFileModel } from "@/models/chat/ChatMessageFileModel"
import { ChatMessageModel, getChatMessageModel } from "@/models/chat/ChatMessageModel"
import { ChatRoomMemberModel, getChatRoomMemberModel } from "@/models/chat/ChatRoomMemberModel"
import { ChatRoomModel, getChatRoomModel } from "@/models/chat/ChatRoomModel"
import { StoredDocumentModel } from "@/models/files/StoredDocumentModel"
import { StoredFileFolderModel } from "@/models/files/StoredFileFolderModel"
import { getStoredFileModel, StoredFileModel } from "@/models/files/StoredFileModel"
import { PermissionModel } from "@/models/users/PermissionModel"
import { getRoleModel, RoleModel } from "@/models/users/RoleModel"
import { RolePermissionModel } from "@/models/users/RolePermissionModel"
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
      UserRole: getUserRoleModel(this.sequelize),
      ChatRoom: getChatRoomModel(this.sequelize),
      ChatRoomMember: getChatRoomMemberModel(this.sequelize),
      ChatMessage: getChatMessageModel(this.sequelize),
      ChatMessageFile: getChatMessageFileModel(this.sequelize),
      StoredFile: getStoredFileModel(this.sequelize)
    } as iDatabase.Models

    this.models.User.associate(this.models)
    this.models.UserRole.associate(this.models)
    this.models.ChatRoom.associate(this.models)
    this.models.ChatRoomMember.associate(this.models)
    this.models.ChatMessage.associate(this.models)
    this.models.ChatMessageFile.associate(this.models)
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
