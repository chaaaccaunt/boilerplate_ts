import type { UUID } from "crypto"
import {
  Association,
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize
} from "sequelize"
import type { NonAttribute } from "sequelize"
import type { RolePermissionModel } from "./RolePermissionModel"

export class PermissionModel extends Model<InferAttributes<PermissionModel>, InferCreationAttributes<PermissionModel>> implements iSharedPermission.PermissionDto {
  declare uid: CreationOptional<UUID>
  declare key: iSharedPermission.PermissionKey
  declare title: string
  declare description: string | null

  static associate(models: iDatabase.Models) {
    this.hasMany(models.RolePermission, { foreignKey: "permissionUid", as: "rolePermissions" })
  }

  declare rolePermissions: NonAttribute<RolePermissionModel[]>

  declare static associations: {
    rolePermissions: Association<PermissionModel, RolePermissionModel>
  };
}

export function getPermissionModel(sequelize: Sequelize) {
  PermissionModel.init(
    {
      uid: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4
      },
      key: {
        type: DataTypes.STRING(128),
        allowNull: false,
        unique: true
      },
      title: {
        type: DataTypes.STRING(128),
        allowNull: false
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true
      }
    },
    {
      sequelize,
      tableName: "permissions",
      modelName: "PermissionModel",
      paranoid: true,
      timestamps: true
    }
  )
  return PermissionModel
}
