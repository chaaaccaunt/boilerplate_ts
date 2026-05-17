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
import type { ChatRoomModel } from "./ChatRoomModel"
import type { UserModel } from "../users/UserModel"

export class ChatRoomMemberModel extends Model<InferAttributes<ChatRoomMemberModel>, InferCreationAttributes<ChatRoomMemberModel>> {
  declare uid: CreationOptional<UUID>
  declare leftAt: Date | null
  declare createdAt: CreationOptional<Date>
  declare updatedAt: CreationOptional<Date>

  declare roomUid: ForeignKey<UUID>
  declare userUid: ForeignKey<UUID>

  static associate(models: iDatabase.Models) {
    this.belongsTo(models.ChatRoom, { foreignKey: "roomUid", as: "room" })
    this.belongsTo(models.User, { foreignKey: "userUid", as: "user" })
  }

  declare room: NonAttribute<ChatRoomModel>
  declare user: NonAttribute<UserModel>

  declare static associations: {
    room: Association<ChatRoomMemberModel, ChatRoomModel>
    user: Association<ChatRoomMemberModel, UserModel>
  };
}

export function getChatRoomMemberModel(sequelize: Sequelize) {
  ChatRoomMemberModel.init(
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
      userUid: {
        type: DataTypes.UUID,
        allowNull: false
      },
      leftAt: {
        type: DataTypes.DATE,
        allowNull: true
      },
      createdAt: DataTypes.DATE,
      updatedAt: DataTypes.DATE
    },
    {
      sequelize,
      tableName: "chat_room_members",
      modelName: "ChatRoomMemberModel",
      paranoid: true,
      timestamps: true,
      indexes: [
        {
          unique: true,
          fields: ["roomUid", "userUid"]
        }
      ]
    }
  )

  return ChatRoomMemberModel
}
