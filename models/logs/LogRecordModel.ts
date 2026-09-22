import type { UUID } from "crypto"
import { CreationOptional, DataTypes, ForeignKey, InferAttributes, InferCreationAttributes, Model, Sequelize } from "sequelize"
import type { Association, NonAttribute } from "sequelize"
import type { RuntimePackageModel } from "./RuntimePackageModel"

export class LogRecordModel extends Model<InferAttributes<LogRecordModel>, InferCreationAttributes<LogRecordModel>> {
  declare uid: CreationOptional<UUID>
  declare timestamp: Date
  declare kind: iSharedLogs.LogKind
  declare level: iSharedLogs.LogLevel
  declare source: string
  declare message: string
  declare context: iSharedLogs.LogValue

  declare packageUid: ForeignKey<RuntimePackageModel["uid"]>

  static associate(models: { RuntimePackage: typeof RuntimePackageModel }) {
    this.belongsTo(models.RuntimePackage, { foreignKey: "packageUid", as: "package" })
  }

  declare package: NonAttribute<RuntimePackageModel>

  declare static associations: {
    package: Association<LogRecordModel, RuntimePackageModel>
  };
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
      kind: {
        type: DataTypes.ENUM("application", "collector_connection", "collector_disconnection"),
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
      },
      packageUid: {
        type: DataTypes.UUID,
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
