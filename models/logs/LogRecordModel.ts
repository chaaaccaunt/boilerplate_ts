import type { UUID } from "crypto"
import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model, Sequelize } from "sequelize"

export class LogRecordModel extends Model<InferAttributes<LogRecordModel>, InferCreationAttributes<LogRecordModel>> {
  declare uid: CreationOptional<UUID>
  declare timestamp: Date
  declare level: iSharedLogs.LogLevel
  declare source: string
  declare message: string
  declare context: iSharedLogs.LogValue

  static associate(_models: iDatabase.Models) {}
}

export function getLogRecordModel(sequelize: Sequelize) {
  LogRecordModel.init(
    {
      uid: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4
      },
      timestamp: {
        type: DataTypes.DATE,
        allowNull: false
      },
      level: {
        type: DataTypes.ENUM("debug", "info", "warn", "error"),
        allowNull: false
      },
      source: {
        type: DataTypes.STRING(120),
        allowNull: false
      },
      message: {
        type: DataTypes.STRING(500),
        allowNull: false
      },
      context: {
        type: DataTypes.JSON,
        allowNull: false
      }
    },
    {
      sequelize,
      tableName: "log_records",
      modelName: "LogRecordModel",
      timestamps: false
    }
  )

  return LogRecordModel
}
