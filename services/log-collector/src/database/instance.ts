import Sequelize, { Options, Sequelize as SequelizeClass } from "sequelize"
import { getLogRecordModel, LogRecordModel } from "@/models/logs/LogRecordModel"
import { getRuntimePackageModel, RuntimePackageModel } from "@/models/logs/RuntimePackageModel"
import { getRuntimePackageConnectionModel, RuntimePackageConnectionModel } from "@/models/logs/RuntimePackageConnectionModel"

export interface DataBaseInstance {
  Sequelize: typeof Sequelize
  sequelize: SequelizeClass
  models: iDatabase.Models
}

export interface iModels {
  LogRecord: typeof LogRecordModel
  RuntimePackage: typeof RuntimePackageModel
  RuntimePackageConnection: typeof RuntimePackageConnectionModel
}

export class Database {
  readonly Sequelize = Sequelize
  readonly sequelize: SequelizeClass
  readonly models: iDatabase.Models

  constructor(config: Options) {
    this.sequelize = new SequelizeClass(config)
    this.models = {
      RuntimePackage: getRuntimePackageModel(this.sequelize),
      RuntimePackageConnection: getRuntimePackageConnectionModel(this.sequelize),
      LogRecord: getLogRecordModel(this.sequelize)
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
