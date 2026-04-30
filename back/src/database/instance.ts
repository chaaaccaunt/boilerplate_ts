import { Options, Sequelize } from "sequelize"
import { getUserModel, UserModel } from "./models/users/UserModel"

export interface iDatabase {
  sequelize: Sequelize
  models: iDatabase.Models
}

export interface iModels {
  User: typeof UserModel
}

export class Database {
  readonly sequelize: Sequelize
  readonly models: iDatabase.Models
  constructor(config: Options) {
    this.sequelize = new Sequelize(config)
    this.models = {
      User: getUserModel(this.sequelize)
    }
  }
}

export interface iDatabaseEnv {
  VAR_DB_HOST: string
  VAR_DB_NAME: string
  VAR_DB_USER: string
  VAR_DB_PASSWORD: string
}