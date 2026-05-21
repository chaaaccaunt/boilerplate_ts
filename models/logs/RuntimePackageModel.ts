import type { UUID } from "crypto"
import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model, Sequelize } from "sequelize"
import type { Association, NonAttribute } from "sequelize"
import type { LogRecordModel } from "./LogRecordModel"
import type { RuntimePackageConnectionModel } from "./RuntimePackageConnectionModel"

export class RuntimePackageModel extends Model<InferAttributes<RuntimePackageModel>, InferCreationAttributes<RuntimePackageModel>> {
  declare uid: UUID
  declare name: string
  declare createdAt: CreationOptional<Date>
  declare updatedAt: CreationOptional<Date>

  static associate(models: iDatabase.Models) {
    const logModels = models as unknown as {
      LogRecord?: typeof LogRecordModel
      RuntimePackageConnection?: typeof RuntimePackageConnectionModel
    }

    if (logModels.LogRecord) this.hasMany(logModels.LogRecord, { foreignKey: "packageUid", as: "logRecords" })
    if (logModels.RuntimePackageConnection) this.hasMany(logModels.RuntimePackageConnection, { foreignKey: "packageUid", as: "connections" })
  }

  declare logRecords: NonAttribute<LogRecordModel[]>
  declare connections: NonAttribute<RuntimePackageConnectionModel[]>

  declare static associations: {
    logRecords: Association<RuntimePackageModel, LogRecordModel>
    connections: Association<RuntimePackageModel, RuntimePackageConnectionModel>
  };
}

export function getRuntimePackageModel(sequelize: Sequelize) {
  RuntimePackageModel.init(
    {
      uid: {
        type: DataTypes.UUID,
        primaryKey: true
      },
      name: {
        type: DataTypes.STRING(120),
        allowNull: false,
        unique: true
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false
      }
    },
    {
      sequelize,
      tableName: "runtime_packages",
      modelName: "RuntimePackageModel",
      timestamps: true
    }
  )

  return RuntimePackageModel
}
