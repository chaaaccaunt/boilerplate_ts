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
import type { ChatRoomMemberModel } from "./ChatRoomMemberModel"

export class ChatRoomModel extends Model<InferAttributes<ChatRoomModel>, InferCreationAttributes<ChatRoomModel>> {
  declare uid: CreationOptional<UUID>
  declare type: iSharedChat.ChatRoomType
  declare title: string
  declare createdAt: CreationOptional<Date>
  declare updatedAt: CreationOptional<Date>

  declare createdByUserUid: ForeignKey<UUID> | null

  static associate(models: iDatabase.Models) {
    this.belongsTo(models.User, { foreignKey: "createdByUserUid", as: "creator" })
    this.hasMany(models.ChatRoomMember, { foreignKey: "roomUid", as: "members" })
    this.hasMany(models.ChatMessage, { foreignKey: "roomUid", as: "messages" })
  }

  declare members: NonAttribute<ChatRoomMemberModel[]>
  declare messages: NonAttribute<ChatMessageModel[]>

  declare static associations: {
    members: Association<ChatRoomModel, ChatRoomMemberModel>
    messages: Association<ChatRoomModel, ChatMessageModel>
  };
}

export function getChatRoomModel(sequelize: Sequelize) {
  ChatRoomModel.init(
    {
      uid: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4
      },
      type: {
        type: DataTypes.ENUM("public", "group", "private"),
        allowNull: false
      },
      title: {
        type: DataTypes.STRING(120),
        allowNull: false
      },
      createdByUserUid: {
        type: DataTypes.UUID,
        allowNull: true
      },
      createdAt: DataTypes.DATE,
      updatedAt: DataTypes.DATE
    },
    {
      sequelize,
      tableName: "chat_rooms",
      modelName: "ChatRoomModel",
      paranoid: true,
      timestamps: true
    }
  )

  return ChatRoomModel
}
