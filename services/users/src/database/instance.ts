import Sequelize, { Options, Sequelize as SequelizeClass } from "sequelize"
import { ChatMessageFileModel } from "@/models/chat/ChatMessageFileModel"
import { ChatMessageModel } from "@/models/chat/ChatMessageModel"
import { ChatRoomMemberModel } from "@/models/chat/ChatRoomMemberModel"
import { ChatRoomModel } from "@/models/chat/ChatRoomModel"
import { StoredFileFolderModel } from "@/models/files/StoredFileFolderModel"
import { StoredFileModel } from "@/models/files/StoredFileModel"
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
      UserRole: getUserRoleModel(this.sequelize)
    } as iDatabase.Models

    this.models.User.associate(this.models)
    this.models.Role.associate(this.models)
    this.models.Permission.associate(this.models)
    this.models.RolePermission.associate(this.models)
    this.models.UserRole.associate(this.models)
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
