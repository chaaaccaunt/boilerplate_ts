import type { UUID } from "crypto";
import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model, Sequelize } from "sequelize";
import type { Association, NonAttribute } from "sequelize";
import type { UserRoleModel } from "./UserRoleModel";

export class UserModel extends Model<InferAttributes<UserModel>, InferCreationAttributes<UserModel>> {
  declare uid: CreationOptional<UUID>
  declare phone: CreationOptional<string>
  declare login: string
  declare password: string
  declare firstName: string
  declare lastName: string
  declare surname: string | null

  declare readonly fullName: CreationOptional<string>

  static associate(models: iDatabase.Models) {
    this.hasMany(models.UserRole, { foreignKey: "userUid", as: "roles" })
  }

  declare roles: NonAttribute<UserRoleModel[]>

  declare static associations: {
    roles: Association<UserModel, UserRoleModel>
  };
}

export function getUserModel(sequelize: Sequelize) {
  UserModel.init(
    {
      uid: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      login: {
        type: DataTypes.STRING(64),
        allowNull: false,
        unique: true,
        validate: {
          isEmail: true
        }
      },
      phone: {
        type: DataTypes.STRING(10),
        allowNull: true,
      },
      password: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      firstName: {
        type: DataTypes.STRING(64),
        allowNull: false
      },
      lastName: {
        type: DataTypes.STRING(64),
        allowNull: false
      },
      surname: {
        type: DataTypes.STRING(64),
        allowNull: true
      },
      fullName: {
        type: DataTypes.VIRTUAL(DataTypes.STRING),
        get() {
          const firstName = this.getDataValue("firstName")
          const lastName = this.getDataValue("lastName")
          const surname = this.getDataValue("surname")

          return [lastName, firstName, surname].filter(Boolean).join(" ")
        }
      },
    },
    {
      sequelize,
      tableName: "users",
      modelName: "UserModel",
      paranoid: true,
      timestamps: true
    }
  )
  return UserModel
}
