import type { UUID } from "crypto"
import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize
} from "sequelize"
import type { Association, NonAttribute } from "sequelize"
import type { UserModel } from "../users/UserModel"

export class RoleModel extends Model<InferAttributes<RoleModel>, InferCreationAttributes<RoleModel>> implements iSharedRole.RoleDto {
  declare uid: CreationOptional<UUID>
  declare name: string

  declare userUid: UUID

  static associate(models: iDatabase.Models) {
    this.belongsTo(models.User, { foreignKey: "userUid", as: "user" })
  }

  declare user: NonAttribute<UserModel>

  declare static associations: {
    user: Association<RoleModel, UserModel>
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
        allowNull: false
      },
      userUid: {
        type: DataTypes.UUID,
        allowNull: false
      }
    },
    {
      sequelize,
      tableName: "roles",
      modelName: "RoleModel",
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
  return RoleModel
}
