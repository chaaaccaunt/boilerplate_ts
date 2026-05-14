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
import type { ChatMessageFileModel } from "./ChatMessageFileModel"
import type { ChatRoomModel } from "./ChatRoomModel"
import type { UserModel } from "../users/UserModel"

export class ChatMessageModel extends Model<InferAttributes<ChatMessageModel>, InferCreationAttributes<ChatMessageModel>> {
  declare uid: CreationOptional<UUID>
  declare text: string | null
  declare createdAt: CreationOptional<Date>
  declare updatedAt: CreationOptional<Date>

  declare roomUid: ForeignKey<UUID>
  declare senderUserUid: ForeignKey<UUID>

  static associate(models: iDatabase.Models) {
    this.belongsTo(models.ChatRoom, { foreignKey: "roomUid", as: "room" })
    this.belongsTo(models.User, { foreignKey: "senderUserUid", as: "sender" })
    this.hasMany(models.ChatMessageFile, { foreignKey: "messageUid", as: "files" })
  }

  declare room: NonAttribute<ChatRoomModel>
  declare sender: NonAttribute<UserModel>
  declare files: NonAttribute<ChatMessageFileModel[]>

  declare static associations: {
    room: Association<ChatMessageModel, ChatRoomModel>
    sender: Association<ChatMessageModel, UserModel>
    files: Association<ChatMessageModel, ChatMessageFileModel>
  };
}

export function getChatMessageModel(sequelize: Sequelize) {
  ChatMessageModel.init(
    {
      uid: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4
      },
      roomUid: {
        type: DataTypes.UUID,
        allowNull: false
      },
      senderUserUid: {
        type: DataTypes.UUID,
        allowNull: false
      },
      text: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      createdAt: DataTypes.DATE,
      updatedAt: DataTypes.DATE
    },
    {
      sequelize,
      tableName: "chat_messages",
      modelName: "ChatMessageModel",
      paranoid: true,
      timestamps: true
    }
  )

  return ChatMessageModel
}
