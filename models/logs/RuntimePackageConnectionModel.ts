import type { UUID } from "crypto"
import { CreationOptional, DataTypes, ForeignKey, InferAttributes, InferCreationAttributes, Model, Sequelize } from "sequelize"
import type { Association, NonAttribute } from "sequelize"
import type { RuntimePackageModel } from "./RuntimePackageModel"

export class RuntimePackageConnectionModel extends Model<InferAttributes<RuntimePackageConnectionModel>, InferCreationAttributes<RuntimePackageConnectionModel>> {
  declare uid: CreationOptional<UUID>
  declare event: iSharedLogs.RuntimePackageConnectionEvent
  declare timestamp: Date
  declare details: iSharedLogs.LogValue

  declare packageUid: ForeignKey<RuntimePackageModel["uid"]>

  static associate(models: iDatabase.Models) {
    const runtimePackageModel = (models as unknown as { RuntimePackage?: typeof RuntimePackageModel }).RuntimePackage
    if (runtimePackageModel) this.belongsTo(runtimePackageModel, { foreignKey: "packageUid", as: "package" })
  }

  declare package: NonAttribute<RuntimePackageModel>

  declare static associations: {
    package: Association<RuntimePackageConnectionModel, RuntimePackageModel>
  };
}

export function getRuntimePackageConnectionModel(sequelize: Sequelize) {
  RuntimePackageConnectionModel.init(
    {
      uid: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4
      },
      packageUid: {
        type: DataTypes.UUID,
        allowNull: false
      },
      event: {
        type: DataTypes.ENUM("connected", "disconnected"),
        allowNull: false
      },
      timestamp: {
        type: DataTypes.DATE,
        allowNull: false
      },
      details: {
        type: DataTypes.JSON,
        allowNull: false
      }
    },
    {
      sequelize,
      tableName: "runtime_package_connections",
      modelName: "RuntimePackageConnectionModel",
      timestamps: false
    }
  )

  return RuntimePackageConnectionModel
}
