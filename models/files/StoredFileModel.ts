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
import type { UserModel } from "../users/UserModel"

export class StoredFileModel extends Model<InferAttributes<StoredFileModel>, InferCreationAttributes<StoredFileModel>> {
  declare uid: CreationOptional<UUID>
  declare originalName: string
  declare mimeType: string
  declare size: number
  declare description: string | null
  declare storagePath: string
  declare createdAt: CreationOptional<Date>
  declare updatedAt: CreationOptional<Date>

  declare createdByUserUid: ForeignKey<UUID>

  static associate(models: iDatabase.Models) {
    this.belongsTo(models.User, { foreignKey: "createdByUserUid", as: "creator" })
  }

  declare creator: NonAttribute<UserModel>

  declare static associations: {
    creator: Association<StoredFileModel, UserModel>
  };
}

export function getStoredFileModel(sequelize: Sequelize) {
  StoredFileModel.init(
    {
      uid: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4
      },
      originalName: {
        type: DataTypes.STRING(255),
        allowNull: false
      },
      mimeType: {
        type: DataTypes.STRING(120),
        allowNull: false
      },
      size: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false
      },
      description: {
        type: DataTypes.STRING(500),
        allowNull: true
      },
      storagePath: {
        type: DataTypes.STRING(128),
        allowNull: false
      },
      createdByUserUid: {
        type: DataTypes.UUID,
        allowNull: false
      },
      createdAt: DataTypes.DATE,
      updatedAt: DataTypes.DATE
    },
    {
      sequelize,
      tableName: "stored_files",
      modelName: "StoredFileModel",
      paranoid: true,
      timestamps: true
    }
  )

  return StoredFileModel
}
