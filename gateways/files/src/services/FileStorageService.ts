import { join } from "path"
import type { UUID } from "crypto"
import { Exceptions, FilePreviewProxy, Logger } from "@/libs"

export class FileStorageService {
  private readonly uploadsRoot = join(process.cwd(), "uploads")
  private readonly previewProxy = new FilePreviewProxy()
  private readonly logger = new Logger()

  constructor(
    private readonly models: iDatabase.Models,
    private readonly databaseTools: iLibs.DatabaseServiceTools
  ) { }

  create(
    file: iContracts.iUploadedFile,
    description: string | null,
    createdByUserUid: iContracts.iUserToken["uid"],
    requestId?: string
  ): Promise<iSharedFiles.UploadedFileDto> {
    return this.models.StoredFile.create({
      originalName: file.originalName,
      mimeType: file.mimeType,
      size: file.size,
      description,
      storagePath: file.storagePath,
      createdByUserUid
    }, {
      logging: this.createMutationQueryLogger("create", "stored_files insert query", requestId)
    })
      .then((storedFile) => this.createPreviewProxy(file)
        .catch((error) => {
          this.logger.warn("Не удалось создать proxy-файл превью", {
            serviceName: this.constructor.name,
            serviceMethod: "create",
            error
          })
        })
        .then(() => storedFile))
      .then((storedFile) => this.toUploadedFileDto(storedFile))
  }

  listOwn(userUid: string): Promise<iSharedFiles.UploadedFileDto[]> {
    return this.models.StoredFile.findAll({
      where: { createdByUserUid: userUid },
      order: [["createdAt", "DESC"]]
    })
      .then((files) => files.map((file) => this.toUploadedFileDto(file)))
  }

  updateMetadata(payload: iSharedFiles.UpdateFilePayloadDto, userUid: string, requestId?: string): Promise<iSharedFiles.UpdateFileResponseDto> {
    return this.findOwned(payload.fileUid, userUid)
      .then((storedFile) => storedFile.update({
        description: payload.description?.trim() || null
      }, {
        logging: this.createMutationQueryLogger("updateMetadata", "stored_files update query", requestId)
      }))
      .then((storedFile) => this.toUploadedFileDto(storedFile))
  }

  delete(payload: iSharedFiles.DeleteFilePayloadDto, userUid: string, requestId?: string): Promise<iSharedFiles.DeleteFileResponseDto> {
    return this.findOwned(payload.fileUid, userUid)
      .then((storedFile) => this.assertFileHasNoChatAttachments(storedFile.uid)
        .then(() => storedFile.destroy({
          logging: this.createMutationQueryLogger("delete", "stored_files delete query", requestId)
        })))
      .then(() => ({ fileUid: payload.fileUid }))
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

  private findOwned(fileUid: string, userUid: string): Promise<iDatabase.Models["StoredFile"]["prototype"]> {
    return this.find(fileUid)
      .then((storedFile) => {
        if (storedFile.createdByUserUid !== userUid) {
          throw new Exceptions.ServiceError.AuthenticationError("Нет доступа к файлу")
        }

        return storedFile
      })
  }

  getContentPath(storedFile: iDatabase.Models["StoredFile"]["prototype"]): string {
    return join(this.uploadsRoot, this.getSafeStoragePath(storedFile.storagePath), "content")
  }

  getPreviewProxyPath(storedFile: iDatabase.Models["StoredFile"]["prototype"]): string {
    return join(this.uploadsRoot, this.getSafeStoragePath(storedFile.storagePath), "preview.jpg")
  }

  toUploadedFileDto(file: iDatabase.Models["StoredFile"]["prototype"]): iSharedFiles.UploadedFileDto {
    return {
      fileUid: file.uid,
      originalName: file.originalName,
      mimeType: file.mimeType,
      size: file.size,
      description: file.description,
      url: this.getDownloadUrl(file.uid),
      viewUrl: this.getViewUrl(file),
      previewUrl: this.getPreviewUrl(file)
    }
  }

  private getDownloadUrl(fileUid: string): string {
    return `/v1/gateway/files/download?fileUid=${encodeURIComponent(fileUid)}`
  }

  private getViewUrl(file: iDatabase.Models["StoredFile"]["prototype"]): string | null {
    if (!this.isViewable(file.mimeType)) return null

    return `/v1/gateway/files/view?fileUid=${encodeURIComponent(file.uid)}`
  }

  private getPreviewUrl(file: iDatabase.Models["StoredFile"]["prototype"]): string | null {
    if (!this.previewProxy.supports(file.mimeType)) return null

    return `/v1/gateway/files/preview?fileUid=${encodeURIComponent(file.uid)}`
  }

  private isViewable(mimeType: string): boolean {
    return [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "video/mp4",
      "video/webm",
      "video/ogg"
    ].includes(mimeType)
  }

  private createPreviewProxy(file: iContracts.iUploadedFile): Promise<void> {
    return this.previewProxy.create({
      sourcePath: join(this.uploadsRoot, this.getSafeStoragePath(file.storagePath), "content"),
      targetPath: join(this.uploadsRoot, this.getSafeStoragePath(file.storagePath), "preview.jpg"),
      mimeType: file.mimeType
    })
      .then(() => undefined)
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

  private assertFileHasNoChatAttachments(fileUid: UUID): Promise<void> {
    return this.models.ChatMessageFile.count({ where: { storedFileUid: fileUid } })
      .then((attachmentsCount) => {
        if (attachmentsCount > 0) {
          throw new Exceptions.ServiceError.ConflictError("Нельзя удалить файл, который прикреплен к сообщению")
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

  private createMutationQueryLogger(serviceMethod: string, event: string, requestId?: string): (sql: string) => void {
    return this.databaseTools.createDatabaseQueryLogger({
      requestId,
      serviceName: this.constructor.name,
      serviceMethod,
      event,
      mutation: true
    })
  }
}
