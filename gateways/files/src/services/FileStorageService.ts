import { join } from "path"
import type { UUID } from "crypto"
import { Exceptions } from "@/libs"

export class FileStorageService {
  private readonly uploadsRoot = join(process.cwd(), "uploads")

  constructor(private readonly models: iDatabase.Models) { }

  create(
    file: iContracts.iUploadedFile,
    description: string | null,
    createdByUserUid: iContracts.iUserToken["uid"]
  ): Promise<iSharedFiles.UploadedFileDto> {
    return this.models.StoredFile.create({
      originalName: file.originalName,
      mimeType: file.mimeType,
      size: file.size,
      description,
      storagePath: file.storagePath,
      createdByUserUid
    })
      .then((storedFile) => this.toUploadedFileDto(storedFile))
  }

  find(fileUid: string): Promise<iDatabase.Models["StoredFile"]["prototype"]> {
    return this.models.StoredFile.findByPk(fileUid)
      .then((storedFile) => {
        if (!storedFile) {
          throw new Error("Файл не найден")
        }

      return storedFile
    })
  }

  findAccessible(fileUid: string, userUid: string): Promise<iDatabase.Models["StoredFile"]["prototype"]> {
    return this.find(fileUid)
      .then((storedFile) => {
        if (storedFile.createdByUserUid === userUid) return storedFile

        return this.assertChatAttachmentAccess(fileUid, userUid as UUID)
          .then(() => storedFile)
      })
  }

  getContentPath(storedFile: iDatabase.Models["StoredFile"]["prototype"]): string {
    return join(this.uploadsRoot, this.getSafeStoragePath(storedFile.storagePath), "content")
  }

  toUploadedFileDto(file: iDatabase.Models["StoredFile"]["prototype"]): iSharedFiles.UploadedFileDto {
    return {
      fileUid: file.uid,
      originalName: file.originalName,
      mimeType: file.mimeType,
      size: file.size,
      description: file.description,
      url: this.getDownloadUrl(file.uid)
    }
  }

  private getDownloadUrl(fileUid: string): string {
    return `/v1/gateway/files/download?fileUid=${encodeURIComponent(fileUid)}`
  }

  private assertChatAttachmentAccess(fileUid: string, userUid: UUID): Promise<void> {
    return this.models.ChatMessageFile.findAll({
      where: { storedFileUid: fileUid },
      include: [{
        association: this.models.ChatMessageFile.associations.message,
        include: [{ association: this.models.ChatMessage.associations.room }]
      }]
    })
      .then((messageFiles) => this.findAccessibleChatAttachment(messageFiles, userUid))
      .then((accessibleAttachment) => {
        if (!accessibleAttachment) {
          throw new Exceptions.ServiceError.AuthenticationError("Нет доступа к файлу")
        }
      })
  }

  private findAccessibleChatAttachment(
    messageFiles: iDatabase.Models["ChatMessageFile"]["prototype"][],
    userUid: UUID
  ): Promise<iDatabase.Models["ChatMessageFile"]["prototype"] | null> {
    return messageFiles.reduce<Promise<iDatabase.Models["ChatMessageFile"]["prototype"] | null>>((previous, messageFile) => previous
      .then((found) => {
        if (found) return found
        if (messageFile.message.room.type === "public") return messageFile

        return this.models.ChatRoomMember.findOne({
          where: {
            roomUid: messageFile.message.roomUid,
            userUid
          }
        })
          .then((member) => member ? messageFile : null)
      }), Promise.resolve(null))
  }

  private getSafeStoragePath(storagePath: string): string {
    if (!/^\d{4}\/\d{2}\/\d{2}\/[0-9a-f-]{36}$/i.test(storagePath)) {
      throw new Error("Некорректный путь хранения файла")
    }

    return storagePath
  }
}
