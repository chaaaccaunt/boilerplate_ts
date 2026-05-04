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
import type { UserModel } from "./UserModel"

export class UserRoleModel extends Model<InferAttributes<UserRoleModel>, InferCreationAttributes<UserRoleModel>> implements iSharedUserRole.UserRoleDto {
  declare uid: CreationOptional<UUID>
  declare name: string

  declare userUid: ForeignKey<UUID>

  static associate(models: iDatabase.Models) {
    this.belongsTo(models.User, { foreignKey: "userUid", as: "user" })
  }

  declare user: NonAttribute<UserModel>

  declare static associations: {
    user: Association<UserRoleModel, UserModel>
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
      name: {
        type: DataTypes.STRING(64),
        allowNull: false
      },
      userUid: {
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
          fields: ["userUid", "name"]
        }
      ]
    }
  )
  return UserRoleModel
}
