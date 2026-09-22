import type { Sequelize } from "sequelize"
import { ChatMessageFileModel, getChatMessageFileModel } from "./ChatMessageFileModel"
import { ChatMessageModel, getChatMessageModel } from "./ChatMessageModel"
import { ChatRoomMemberModel, getChatRoomMemberModel } from "./ChatRoomMemberModel"
import { ChatRoomModel, getChatRoomModel } from "./ChatRoomModel"
import { getStoredFileModel, StoredFileModel } from "../files/StoredFileModel"
import { getRoleModel, RoleModel } from "../users/RoleModel"
import { getUserModel, UserModel } from "../users/UserModel"
import { getUserRoleModel, UserRoleModel } from "../users/UserRoleModel"

export interface ChatModels {
  User: typeof UserModel
  Role: typeof RoleModel
  UserRole: typeof UserRoleModel
  ChatRoom: typeof ChatRoomModel
  ChatRoomMember: typeof ChatRoomMemberModel
  ChatMessage: typeof ChatMessageModel
  ChatMessageFile: typeof ChatMessageFileModel
  StoredFile: typeof StoredFileModel
}

export function createChatModels(sequelize: Sequelize): ChatModels {
  const models: ChatModels = {
    User: getUserModel(sequelize),
    Role: getRoleModel(sequelize),
    UserRole: getUserRoleModel(sequelize),
    ChatRoom: getChatRoomModel(sequelize),
    ChatRoomMember: getChatRoomMemberModel(sequelize),
    ChatMessage: getChatMessageModel(sequelize),
    ChatMessageFile: getChatMessageFileModel(sequelize),
    StoredFile: getStoredFileModel(sequelize)
  }

  models.User.associate(models)
  models.UserRole.associate(models)
  models.ChatRoom.associate(models)
  models.ChatRoomMember.associate(models)
  models.ChatMessage.associate(models)
  models.ChatMessageFile.associate(models)

  return models
}
