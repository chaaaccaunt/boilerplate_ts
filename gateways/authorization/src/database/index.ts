import Sequelize, { Options, Sequelize as SequelizeClass } from "sequelize"
import { AuthorizationModels, createAuthorizationModels } from "@/models/users/UserModelRegistry"

export interface DataBaseInstance {
  Sequelize: typeof Sequelize
  sequelize: SequelizeClass
  models: iDatabase.Models
}

export interface iModels extends AuthorizationModels { }

declare global {
  namespace iDatabase {
    interface Database extends DataBaseInstance { }
    interface Models extends iModels { }
  }
}

export class Database {
  readonly Sequelize = Sequelize
  readonly sequelize: SequelizeClass
  readonly models: iDatabase.Models

  constructor(config: Options) {
    this.sequelize = new SequelizeClass(config)
    this.models = createAuthorizationModels(this.sequelize)
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
