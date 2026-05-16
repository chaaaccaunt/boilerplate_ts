import Sequelize, { Options, Sequelize as SequelizeClass } from "sequelize"

export interface DataBaseInstance {
  Sequelize: typeof Sequelize
  sequelize: SequelizeClass
  models: iDatabase.Models
}

export interface iModels { }

export class Database {
  readonly Sequelize = Sequelize
  readonly sequelize: SequelizeClass
  readonly models: iDatabase.Models = {}

  constructor(config: Options) {
    this.sequelize = new SequelizeClass(config)
  }
}

export interface iDatabaseEnv {
  VAR_DB_HOST: string
  VAR_DB_NAME: string
  VAR_DB_USER: string
  VAR_DB_PASSWORD: string
}
