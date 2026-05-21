import Sequelize, { Options, Sequelize as SequelizeClass } from "sequelize"
import { getRoleModel, RoleModel } from "@/models/users/RoleModel"
import { getUserRoleModel, UserRoleModel } from "@/models/users/UserRoleModel"
import { getUserModel, UserModel } from "@/models/users/UserModel"
import { getUserSessionModel, UserSessionModel } from "@/models/users/UserSessionModel"

export interface DataBaseInstance {
  Sequelize: typeof Sequelize
  sequelize: SequelizeClass
  models: iDatabase.Models
}

export interface iModels {
  User: typeof UserModel
  Role: typeof RoleModel
  UserRole: typeof UserRoleModel
  UserSession: typeof UserSessionModel
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
      UserSession: getUserSessionModel(this.sequelize)
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
