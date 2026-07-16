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

export class StoredFileFolderModel extends Model<InferAttributes<StoredFileFolderModel>, InferCreationAttributes<StoredFileFolderModel>> {
  declare uid: CreationOptional<UUID>
  declare title: string
  declare visibility: iSharedFiles.FileVisibility
  declare createdAt: CreationOptional<Date>
  declare updatedAt: CreationOptional<Date>

  declare parentFolderUid: ForeignKey<UUID> | null
  declare createdByUserUid: ForeignKey<UUID>

  static associate(models: iDatabase.Models) {
    this.belongsTo(models.User, { foreignKey: "createdByUserUid", as: "creator" })
    this.belongsTo(models.StoredFileFolder, { foreignKey: "parentFolderUid", as: "parentFolder" })
    this.hasMany(models.StoredFileFolder, { foreignKey: "parentFolderUid", as: "childFolders" })
    this.hasMany(models.StoredFile, { foreignKey: "folderUid", as: "files" })
  }

  declare creator: NonAttribute<UserModel>
  declare parentFolder: NonAttribute<StoredFileFolderModel | null>
  declare childFolders: NonAttribute<StoredFileFolderModel[]>

  declare static associations: {
    creator: Association<StoredFileFolderModel, UserModel>
    parentFolder: Association<StoredFileFolderModel, StoredFileFolderModel>
    childFolders: Association<StoredFileFolderModel, StoredFileFolderModel>
    files: Association<StoredFileFolderModel, iDatabase.Models["StoredFile"]["prototype"]>
  };
}

export function getStoredFileFolderModel(sequelize: Sequelize) {
  StoredFileFolderModel.init(
    {
      uid: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4
      },
      title: {
        type: DataTypes.STRING(120),
        allowNull: false
      },
      parentFolderUid: {
        type: DataTypes.UUID,
        allowNull: true
      },
      visibility: {
        type: DataTypes.ENUM("public", "private"),
        allowNull: false,
        defaultValue: "public"
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
      tableName: "stored_file_folders",
      modelName: "StoredFileFolderModel",
      paranoid: true,
      timestamps: true
    }
  )

  return StoredFileFolderModel
}
