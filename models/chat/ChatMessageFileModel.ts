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
import type { ChatMessageModel } from "./ChatMessageModel"
import type { StoredFileModel } from "../files/StoredFileModel"

export class ChatMessageFileModel extends Model<InferAttributes<ChatMessageFileModel>, InferCreationAttributes<ChatMessageFileModel>> {
  declare uid: CreationOptional<UUID>
  declare createdAt: CreationOptional<Date>
  declare updatedAt: CreationOptional<Date>

  declare messageUid: ForeignKey<UUID>
  declare storedFileUid: ForeignKey<UUID>

  static associate(models: iDatabase.Models) {
    this.belongsTo(models.ChatMessage, { foreignKey: "messageUid", as: "message" })
    this.belongsTo(models.StoredFile, { foreignKey: "storedFileUid", as: "storedFile" })
  }

  declare message: NonAttribute<ChatMessageModel>
  declare storedFile: NonAttribute<StoredFileModel>

  declare static associations: {
    message: Association<ChatMessageFileModel, ChatMessageModel>
    storedFile: Association<ChatMessageFileModel, StoredFileModel>
  };
}

export function getChatMessageFileModel(sequelize: Sequelize) {
  ChatMessageFileModel.init(
    {
      uid: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4
      },
      messageUid: {
        type: DataTypes.UUID,
        allowNull: false
      },
      storedFileUid: {
        type: DataTypes.UUID,
        allowNull: false
      },
      createdAt: DataTypes.DATE,
      updatedAt: DataTypes.DATE
    },
    {
      sequelize,
      tableName: "chat_message_files",
      modelName: "ChatMessageFileModel",
      paranoid: true,
      timestamps: true
    }
  )

  return ChatMessageFileModel
}
