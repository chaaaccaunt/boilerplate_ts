import type { Sequelize } from "sequelize"
import { getLogRecordModel, LogRecordModel } from "./LogRecordModel"
import { getRuntimePackageConnectionModel, RuntimePackageConnectionModel } from "./RuntimePackageConnectionModel"
import { getRuntimePackageModel, RuntimePackageModel } from "./RuntimePackageModel"

export interface LogModels {
  LogRecord: typeof LogRecordModel
  RuntimePackage: typeof RuntimePackageModel
  RuntimePackageConnection: typeof RuntimePackageConnectionModel
}

export function createLogModels(sequelize: Sequelize): LogModels {
  const models: LogModels = {
    LogRecord: getLogRecordModel(sequelize),
    RuntimePackage: getRuntimePackageModel(sequelize),
    RuntimePackageConnection: getRuntimePackageConnectionModel(sequelize)
  }

  models.LogRecord.associate(models)
  models.RuntimePackage.associate(models)
  models.RuntimePackageConnection.associate(models)

  return models
}
