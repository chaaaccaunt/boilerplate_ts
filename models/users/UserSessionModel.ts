import type { UUID } from "crypto"
import { CreationOptional, DataTypes, ForeignKey, InferAttributes, InferCreationAttributes, Model, Sequelize } from "sequelize"
import type { Association, NonAttribute } from "sequelize"
import type { UserModel } from "./UserModel"

export class UserSessionModel extends Model<InferAttributes<UserSessionModel>, InferCreationAttributes<UserSessionModel>> {
  declare uid: CreationOptional<UUID>
  declare ipAddress: string | null
  declare userAgent: string
  declare deviceType: string
  declare operatingSystem: string
  declare browser: string
  declare lastSeenAt: Date
  declare revokedAt: Date | null
  declare createdAt: CreationOptional<Date>
  declare updatedAt: CreationOptional<Date>

  declare userUid: ForeignKey<UserModel["uid"]>

  static associate(models: iDatabase.Models) {
    this.belongsTo(models.User, { foreignKey: "userUid", as: "user" })
  }

  declare user: NonAttribute<UserModel>

  declare static associations: {
    user: Association<UserSessionModel, UserModel>
  };
}

export function getUserSessionModel(sequelize: Sequelize) {
  UserSessionModel.init(
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
      ipAddress: {
        type: DataTypes.STRING(64),
        allowNull: true
      },
      userAgent: {
        type: DataTypes.STRING(500),
        allowNull: false
      },
      deviceType: {
        type: DataTypes.STRING(32),
        allowNull: false
      },
      operatingSystem: {
        type: DataTypes.STRING(80),
        allowNull: false
      },
      browser: {
        type: DataTypes.STRING(80),
        allowNull: false
      },
      lastSeenAt: {
        type: DataTypes.DATE,
        allowNull: false
      },
      revokedAt: {
        type: DataTypes.DATE,
        allowNull: true
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
      tableName: "user_sessions",
      modelName: "UserSessionModel",
      timestamps: true
    }
  )

  return UserSessionModel
}
