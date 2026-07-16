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
import type { StoredFileFolderModel } from "./StoredFileFolderModel"
import type { UserModel } from "../users/UserModel"

export class StoredDocumentModel extends Model<InferAttributes<StoredDocumentModel>, InferCreationAttributes<StoredDocumentModel>> {
  declare uid: CreationOptional<UUID>
  declare title: string
  declare contentJson: string
  declare contentHtml: string
  declare visibility: iSharedFiles.FileVisibility
  declare status: iSharedFiles.StoredDocumentStatus
  declare finalizedAt: Date | null
  declare createdAt: CreationOptional<Date>
  declare updatedAt: CreationOptional<Date>

  declare folderUid: ForeignKey<UUID> | null
  declare createdByUserUid: ForeignKey<UUID>

  static associate(models: iDatabase.Models) {
    this.belongsTo(models.User, { foreignKey: "createdByUserUid", as: "creator" })
    this.belongsTo(models.StoredFileFolder, { foreignKey: "folderUid", as: "folder" })
  }

  declare creator: NonAttribute<UserModel>
  declare folder: NonAttribute<StoredFileFolderModel | null>

  declare static associations: {
    creator: Association<StoredDocumentModel, UserModel>
    folder: Association<StoredDocumentModel, StoredFileFolderModel>
  };
}

export function getStoredDocumentModel(sequelize: Sequelize) {
  StoredDocumentModel.init(
    {
      uid: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4
      },
      title: {
        type: DataTypes.STRING(180),
        allowNull: false
      },
      contentJson: {
        type: DataTypes.TEXT("long"),
        allowNull: false
      },
      contentHtml: {
        type: DataTypes.TEXT("long"),
        allowNull: false
      },
      folderUid: {
        type: DataTypes.UUID,
        allowNull: true
      },
      visibility: {
        type: DataTypes.ENUM("public", "private"),
        allowNull: false,
        defaultValue: "public"
      },
      status: {
        type: DataTypes.ENUM("draft", "final"),
        allowNull: false,
        defaultValue: "draft"
      },
      finalizedAt: {
        type: DataTypes.DATE,
        allowNull: true
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
      tableName: "stored_documents",
      modelName: "StoredDocumentModel",
      paranoid: true,
      timestamps: true
    }
  )

  return StoredDocumentModel
}
