import type { Sequelize } from "sequelize"
import { ChatMessageFileModel, getChatMessageFileModel } from "../chat/ChatMessageFileModel"
import { getUserModel, UserModel } from "../users/UserModel"
import { getStoredDocumentModel, StoredDocumentModel } from "./StoredDocumentModel"
import { getStoredFileFolderModel, StoredFileFolderModel } from "./StoredFileFolderModel"
import { getStoredFileModel, StoredFileModel } from "./StoredFileModel"

export interface FileModels {
  User: typeof UserModel
  ChatMessageFile: typeof ChatMessageFileModel
  StoredFileFolder: typeof StoredFileFolderModel
  StoredFile: typeof StoredFileModel
  StoredDocument: typeof StoredDocumentModel
}

export function createFileModels(sequelize: Sequelize): FileModels {
  const models: FileModels = {
    User: getUserModel(sequelize),
    ChatMessageFile: getChatMessageFileModel(sequelize),
    StoredFileFolder: getStoredFileFolderModel(sequelize),
    StoredFile: getStoredFileModel(sequelize),
    StoredDocument: getStoredDocumentModel(sequelize)
  }

  models.StoredFileFolder.associate(models)
  models.StoredFile.associate(models)
  models.StoredDocument.associate(models)

  return models
}
