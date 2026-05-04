import type { UUID } from "crypto"
import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  ForeignKey,
  Model,
  Sequelize
} from "sequelize"
import type { Association, NonAttribute } from "sequelize"
import type { RoleModel } from "./RoleModel"
import type { UserModel } from "./UserModel"

export class UserRoleModel extends Model<InferAttributes<UserRoleModel>, InferCreationAttributes<UserRoleModel>> {
  declare uid: CreationOptional<UUID>

  declare userUid: ForeignKey<UUID>
  declare roleUid: ForeignKey<UUID>

  static associate(models: iDatabase.Models) {
    this.belongsTo(models.User, { foreignKey: "userUid", as: "user" })
    this.belongsTo(models.Role, { foreignKey: "roleUid", as: "role" })
  }

  declare user: NonAttribute<UserModel>
  declare role: NonAttribute<RoleModel>

  declare static associations: {
    user: Association<UserRoleModel, UserModel>
    role: Association<UserRoleModel, RoleModel>
  };
}

export function getUserRoleModel(sequelize: Sequelize) {
  UserRoleModel.init(
    {
      uid: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4
      },
      userUid: {
        type: DataTypes.UUID,
        allowNull: false
      },
      roleUid: {
        type: DataTypes.UUID,
        allowNull: false
      }
    },
    {
      sequelize,
      tableName: "user_roles",
      modelName: "UserRoleModel",
      paranoid: true,
      timestamps: true,
      indexes: [
        {
          unique: true,
          fields: ["userUid", "roleUid"]
        }
      ]
    }
  )
  return UserRoleModel
}
