import type { UUID } from "crypto"
import {
  CreationOptional,
  DataTypes,
  ForeignKey,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize
} from "sequelize"
import type { Association, NonAttribute } from "sequelize"
import type { PermissionModel } from "./PermissionModel"
import type { RoleModel } from "./RoleModel"

export class RolePermissionModel extends Model<InferAttributes<RolePermissionModel>, InferCreationAttributes<RolePermissionModel>> {
  declare uid: CreationOptional<UUID>

  declare roleUid: ForeignKey<UUID>
  declare permissionUid: ForeignKey<UUID>

  static associate(models: iDatabase.Models) {
    this.belongsTo(models.Role, { foreignKey: "roleUid", as: "role" })
    this.belongsTo(models.Permission, { foreignKey: "permissionUid", as: "permission" })
  }

  declare role: NonAttribute<RoleModel>
  declare permission: NonAttribute<PermissionModel>

  declare static associations: {
    role: Association<RolePermissionModel, RoleModel>
    permission: Association<RolePermissionModel, PermissionModel>
  };
}

export function getRolePermissionModel(sequelize: Sequelize) {
  RolePermissionModel.init(
    {
      uid: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4
      },
      roleUid: {
        type: DataTypes.UUID,
        allowNull: false
      },
      permissionUid: {
        type: DataTypes.UUID,
        allowNull: false
      }
    },
    {
      sequelize,
      tableName: "role_permissions",
      modelName: "RolePermissionModel",
      paranoid: true,
      timestamps: true,
      indexes: [
        {
          unique: true,
          fields: ["roleUid", "permissionUid"]
        }
      ]
    }
  )
  return RolePermissionModel
}
