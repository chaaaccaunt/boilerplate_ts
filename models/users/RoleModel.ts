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
import type { UserRoleModel } from "./UserRoleModel"

export class RoleModel extends Model<InferAttributes<RoleModel>, InferCreationAttributes<RoleModel>> {
  declare uid: CreationOptional<UUID>
  declare name: iSharedUserRole.UserRoleName

  static associate(models: iDatabase.Models) {
    this.hasMany(models.UserRole, { foreignKey: "roleUid", as: "userRoles" })
    this.hasMany(models.RolePermission, { foreignKey: "roleUid", as: "rolePermissions" })
  }

  declare userRoles: NonAttribute<UserRoleModel[]>
  declare rolePermissions: NonAttribute<RolePermissionModel[]>

  declare static associations: {
    rolePermissions: Association<RoleModel, RolePermissionModel>
    userRoles: Association<RoleModel, UserRoleModel>
  };
}

export function getRoleModel(sequelize: Sequelize) {
  RoleModel.init(
    {
      uid: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4
      },
      name: {
        type: DataTypes.STRING(64),
        allowNull: false,
        unique: true
      }
    },
    {
      sequelize,
      tableName: "roles",
      modelName: "RoleModel",
      paranoid: true,
      timestamps: true
    }
  )
  return RoleModel
}
