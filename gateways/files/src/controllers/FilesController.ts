import { Exceptions, HTTPController } from "@/libs"
import { FileEventsGatewayClient } from "@/services/FileEventsGatewayClient"
import { FileStorageService } from "@/services/FileStorageService"

interface iUploadPayload extends iContracts.iRequestContextPayload<iContracts.iMultipartPayload> {}

interface iDownloadPayload extends iContracts.iRequestContextPayload<iContracts.iPayload> {}
interface iArchiveDownloadPayload extends iContracts.iRequestContextPayload<iContracts.iPayload> {}

export class FilesController extends HTTPController {
  private readonly service: FileStorageService

  constructor(
    models: iDatabase.Models,
    databaseTools: iLibs.DatabaseServiceTools,
    private readonly fileEventsGatewayClient: FileEventsGatewayClient | null = null
  ) {
    super()
    this.service = new FileStorageService(models, databaseTools)

    const uploadRoute: iContracts.iRoute<iContracts.iMultipartPayload, iContracts.iControllerResult<iSharedFiles.UploadResponseDto>> = {
      url: /^\/files\/upload\/?$/,
      method: "POST",
      requireAuthorization: true,
      requestBodyType: "multipart",
      callback: this.handle("upload", this.upload.bind(this))
    }

    const listRoute: iContracts.iRoute<iSharedFiles.ListFolderContentPayloadDto, iContracts.iControllerResult<iSharedFiles.ListFolderContentResponseDto>> = {
      url: /^\/files\/?(?:\?.*)?$/,
      method: "GET",
      requireAuthorization: true,
      callback: this.handle("list", this.list.bind(this))
    }

    const ownersRoute: iContracts.iRoute<iContracts.iPayload, iContracts.iControllerResult<iSharedFiles.ListFileOwnersResponseDto>> = {
      url: /^\/files\/owners\/?$/,
      method: "GET",
      requireAuthorization: true,
      callback: this.handle("listOwners", this.listOwners.bind(this))
    }

    const metadataRoute: iContracts.iRoute<iSharedFiles.GetFileMetadataPayloadDto, iContracts.iControllerResult<iSharedFiles.GetFileMetadataResponseDto>> = {
      url: /^\/files\/metadata(?:\?.*)?$/,
      method: "GET",
      requireAuthorization: true,
      callback: this.handle("getMetadata", this.getMetadata.bind(this))
    }

    const createFolderRoute: iContracts.iRoute<iSharedFiles.CreateFileFolderPayloadDto, iContracts.iControllerResult<iSharedFiles.CreateFileFolderResponseDto>> = {
      url: /^\/files\/folders\/?$/,
      method: "POST",
      requireAuthorization: true,
      validator: {
        title: { isPrimitive: { string: { minLength: 1, maxLength: 120 } } },
        parentFolderUid: { optional: true, isPrimitive: { string: { minLength: 1, maxLength: 128 } } },
        visibility: { optional: true, isPrimitive: { string: { minLength: 6, maxLength: 7, reg: /^(public|private)$/ } } }
      },
      callback: this.handle("createFolder", this.createFolder.bind(this))
    }

    const updateFolderRoute: iContracts.iRoute<iSharedFiles.UpdateFileFolderPayloadDto, iContracts.iControllerResult<iSharedFiles.UpdateFileFolderResponseDto>> = {
      url: /^\/files\/folders\/?$/,
      method: "PATCH",
      requireAuthorization: true,
      validator: {
        folderUid: { isPrimitive: { string: { minLength: 1, maxLength: 128 } } },
        title: { optional: true, isPrimitive: { string: { minLength: 1, maxLength: 120 } } },
        parentFolderUid: { optional: true, isPrimitive: { string: { minLength: 1, maxLength: 128 } } },
        visibility: { optional: true, isPrimitive: { string: { minLength: 6, maxLength: 7, reg: /^(public|private)$/ } } }
      },
      callback: this.handle("updateFolder", this.updateFolder.bind(this))
    }

    const deleteFolderRoute: iContracts.iRoute<iSharedFiles.DeleteFileFolderPayloadDto, iContracts.iControllerResult<iSharedFiles.DeleteFileFolderResponseDto>> = {
      url: /^\/files\/folders\/?$/,
      method: "DELETE",
      requireAuthorization: true,
      validator: {
        folderUid: { isPrimitive: { string: { minLength: 1, maxLength: 128 } } }
      },
      callback: this.handle("deleteFolder", this.deleteFolder.bind(this))
    }

    const updateRoute: iContracts.iRoute<iSharedFiles.UpdateFilePayloadDto, iContracts.iControllerResult<iSharedFiles.UpdateFileResponseDto>> = {
      url: /^\/files\/?$/,
      method: "PATCH",
      requireAuthorization: true,
      validator: {
        fileUid: { isPrimitive: { string: { minLength: 1, maxLength: 128 } } },
        description: { optional: true, isPrimitive: { string: { minLength: 1, maxLength: 500 } } },
        folderUid: { optional: true, isPrimitive: { string: { minLength: 1, maxLength: 128 } } },
        visibility: { optional: true, isPrimitive: { string: { minLength: 6, maxLength: 7, reg: /^(public|private)$/ } } }
      },
      callback: this.handle("update", this.update.bind(this))
    }

    const deleteRoute: iContracts.iRoute<iSharedFiles.DeleteFilePayloadDto, iContracts.iControllerResult<iSharedFiles.DeleteFileResponseDto>> = {
      url: /^\/files\/?$/,
      method: "DELETE",
      requireAuthorization: true,
      validator: {
        fileUid: { isPrimitive: { string: { minLength: 1, maxLength: 128 } } }
      },
      callback: this.handle("delete", this.delete.bind(this))
    }

    const createDocumentRoute: iContracts.iRoute<iSharedFiles.CreateDocumentPayloadDto, iContracts.iControllerResult<iSharedFiles.CreateDocumentResponseDto>> = {
      url: /^\/files\/documents\/?$/,
      method: "POST",
      requireAuthorization: true,
      validator: {
        title: { isPrimitive: { string: { minLength: 1, maxLength: 180 } } },
        folderUid: { optional: true, isPrimitive: { string: { minLength: 1, maxLength: 128 } } },
        visibility: { optional: true, isPrimitive: { string: { minLength: 6, maxLength: 7, reg: /^(public|private)$/ } } }
      },
      callback: this.handle("createDocument", this.createDocument.bind(this))
    }

    const getDocumentRoute: iContracts.iRoute<iSharedFiles.GetDocumentPayloadDto, iContracts.iControllerResult<iSharedFiles.GetDocumentResponseDto>> = {
      url: /^\/files\/documents\/metadata(?:\?.*)?$/,
      method: "GET",
      requireAuthorization: true,
      callback: this.handle("getDocument", this.getDocument.bind(this))
    }

    const updateDocumentRoute: iContracts.iRoute<iSharedFiles.UpdateDocumentPayloadDto, iContracts.iControllerResult<iSharedFiles.UpdateDocumentResponseDto>> = {
      url: /^\/files\/documents\/?$/,
      method: "PATCH",
      requireAuthorization: true,
      validator: {
        documentUid: { isPrimitive: { string: { minLength: 1, maxLength: 128 } } },
        title: { optional: true, isPrimitive: { string: { minLength: 1, maxLength: 180 } } },
        contentJson: { optional: true, isPrimitive: { string: { minLength: 0, maxLength: 5242880 } } },
        contentHtml: { optional: true, isPrimitive: { string: { minLength: 0, maxLength: 5242880 } } },
        folderUid: { optional: true, isPrimitive: { string: { minLength: 1, maxLength: 128 } } },
        visibility: { optional: true, isPrimitive: { string: { minLength: 6, maxLength: 7, reg: /^(public|private)$/ } } },
        status: { optional: true, isPrimitive: { string: { minLength: 5, maxLength: 5, reg: /^(draft|final)$/ } } }
      },
      callback: this.handle("updateDocument", this.updateDocument.bind(this))
    }

    const deleteDocumentRoute: iContracts.iRoute<iSharedFiles.DeleteDocumentPayloadDto, iContracts.iControllerResult<iSharedFiles.DeleteDocumentResponseDto>> = {
      url: /^\/files\/documents\/?$/,
      method: "DELETE",
      requireAuthorization: true,
      validator: {
        documentUid: { isPrimitive: { string: { minLength: 1, maxLength: 128 } } }
      },
      callback: this.handle("deleteDocument", this.deleteDocument.bind(this))
    }

    const exportDocumentRoute: iContracts.iRoute<iContracts.iPayload, iContracts.iFileControllerResult> = {
      url: /^\/files\/documents\/export(?:\?.*)?$/,
      method: "GET",
      requireAuthorization: true,
      callback: this.handle("exportDocument", this.exportDocument.bind(this))
    }

    const downloadRoute: iContracts.iRoute<iContracts.iPayload, iContracts.iFileControllerResult> = {
      url: /^\/files\/download(?:\?.*)?$/,
      method: "GET",
      requireAuthorization: true,
      callback: this.handle("download", this.download.bind(this))
    }

    const createArchiveRoute: iContracts.iRoute<iSharedFiles.CreateFilesArchivePayloadDto, iContracts.iControllerResult<iSharedFiles.CreateFilesArchiveResponseDto>> = {
      url: /^\/files\/archives\/?$/,
      method: "POST",
      requireAuthorization: true,
      validator: {
        fileUids: { isArray: { isPrimitive: { string: { minLength: 1, maxLength: 128 } } } }
      },
      callback: this.handle("createArchive", this.createArchive.bind(this))
    }

    const downloadArchiveRoute: iContracts.iRoute<iContracts.iPayload, iContracts.iFileControllerResult> = {
      url: /^\/files\/archives\/download(?:\?.*)?$/,
      method: "GET",
      requireAuthorization: true,
      callback: this.handle("downloadArchive", this.downloadArchive.bind(this))
    }

    const confirmArchiveDownloadRoute: iContracts.iRoute<iSharedFiles.ConfirmFilesArchiveDownloadPayloadDto, iContracts.iControllerResult<iSharedFiles.ConfirmFilesArchiveDownloadResponseDto>> = {
      url: /^\/files\/archives\/success\/?$/,
      method: "POST",
      requireAuthorization: true,
      validator: {
        archiveUid: { isPrimitive: { string: { minLength: 36, maxLength: 36 } } }
      },
      callback: this.handle("confirmArchiveDownload", this.confirmArchiveDownload.bind(this))
    }

    const viewRoute: iContracts.iRoute<iContracts.iPayload, iContracts.iFileControllerResult> = {
      url: /^\/files\/view(?:\?.*)?$/,
      method: "GET",
      requireAuthorization: true,
      callback: this.handle("view", this.view.bind(this))
    }

    const previewRoute: iContracts.iRoute<iContracts.iPayload, iContracts.iFileControllerResult> = {
      url: /^\/files\/preview(?:\?.*)?$/,
      method: "GET",
      requireAuthorization: true,
      callback: this.handle("preview", this.preview.bind(this))
    }

    this.addRoutes([uploadRoute, ownersRoute, metadataRoute, listRoute, createFolderRoute, updateFolderRoute, deleteFolderRoute, updateRoute, deleteRoute, createDocumentRoute, getDocumentRoute, updateDocumentRoute, deleteDocumentRoute, exportDocumentRoute, downloadRoute, createArchiveRoute, downloadArchiveRoute, confirmArchiveDownloadRoute, viewRoute, previewRoute])
  }

  private upload(payload: iUploadPayload): Promise<iContracts.iControllerResult<iSharedFiles.UploadResponseDto>> {
    if (!payload.user) throw new Exceptions.ControllerError.UnauthorizedError()
    if (!payload.data) throw new Exceptions.ControllerError.InternalError("Отсутствуют данные multipart-запроса")

    const user = payload.user
    const description = this.getDescription(payload.data.fields)
    const folderUid = this.getOptionalString(payload.data.fields.folderUid)
    const visibility = this.getVisibility(payload.data.fields.visibility)

    return Promise.all(payload.data.files.map((file) => this.service.create(file, description, folderUid, visibility, user.uid, user, payload.requestId)))
      .then((files) => {
        this.notifyFileEvent("files:file:created")

        return {
          data: {
            files
          }
        }
      })
  }

  private list(payload: iContracts.iRequestContextPayload<iSharedFiles.ListFolderContentPayloadDto>): Promise<iContracts.iControllerResult<iSharedFiles.ListFolderContentResponseDto>> {
    if (!payload.user) throw new Exceptions.ControllerError.UnauthorizedError()

    return this.service.listContent(payload.data || {}, payload.user)
      .then((data) => ({
        data
      }))
  }

  private listOwners(payload: iContracts.iRequestContextPayload): Promise<iContracts.iControllerResult<iSharedFiles.ListFileOwnersResponseDto>> {
    if (!payload.user) throw new Exceptions.ControllerError.UnauthorizedError()

    return this.service.listOwners(payload.user)
      .then((data) => ({ data }))
  }

  private getMetadata(payload: iContracts.iRequestContextPayload<iSharedFiles.GetFileMetadataPayloadDto>): Promise<iContracts.iControllerResult<iSharedFiles.GetFileMetadataResponseDto>> {
    if (!payload.user) throw new Exceptions.ControllerError.UnauthorizedError()
    if (!payload.data) throw new Exceptions.ControllerError.InternalError("Отсутствуют данные запроса")

    const fileUid = payload.data.fileUid

    if (typeof fileUid !== "string") {
      throw new Exceptions.ControllerError.NotFoundError("Файл не найден")
    }

    return this.service.findAccessible(fileUid, payload.user)
      .then((storedFile) => ({
        data: this.service.toUploadedFileDto(storedFile)
      }))
      .catch((error) => {
        throw new Exceptions.ControllerError.NotFoundError("Файл не найден", { cause: error })
      })
  }

  private createFolder(payload: iContracts.iRequestContextPayload<iSharedFiles.CreateFileFolderPayloadDto>): Promise<iContracts.iControllerResult<iSharedFiles.CreateFileFolderResponseDto>> {
    if (!payload.user) throw new Exceptions.ControllerError.UnauthorizedError()
    if (!payload.data) throw new Exceptions.ControllerError.InternalError("Отсутствуют данные запроса")

    return this.service.createFolder(payload.data, payload.user, payload.requestId)
      .then((data) => {
        this.notifyFileEvent("files:folder:created")
        return { data }
      })
  }

  private updateFolder(payload: iContracts.iRequestContextPayload<iSharedFiles.UpdateFileFolderPayloadDto>): Promise<iContracts.iControllerResult<iSharedFiles.UpdateFileFolderResponseDto>> {
    if (!payload.user) throw new Exceptions.ControllerError.UnauthorizedError()
    if (!payload.data) throw new Exceptions.ControllerError.InternalError("Отсутствуют данные запроса")

    return this.service.updateFolder(payload.data, payload.user, payload.requestId)
      .then((data) => {
        this.notifyFileEvent("files:folder:updated")
        return { data }
      })
  }

  private deleteFolder(payload: iContracts.iRequestContextPayload<iSharedFiles.DeleteFileFolderPayloadDto>): Promise<iContracts.iControllerResult<iSharedFiles.DeleteFileFolderResponseDto>> {
    if (!payload.user) throw new Exceptions.ControllerError.UnauthorizedError()
    if (!payload.data) throw new Exceptions.ControllerError.InternalError("Отсутствуют данные запроса")

    return this.service.deleteFolder(payload.data, payload.user, payload.requestId)
      .then((data) => {
        this.notifyFileEvent("files:folder:deleted")
        return { data }
      })
  }

  private update(payload: iContracts.iRequestContextPayload<iSharedFiles.UpdateFilePayloadDto>): Promise<iContracts.iControllerResult<iSharedFiles.UpdateFileResponseDto>> {
    if (!payload.user) throw new Exceptions.ControllerError.UnauthorizedError()
    if (!payload.data) throw new Exceptions.ControllerError.InternalError("Отсутствуют данные запроса")

    return this.service.updateMetadata(payload.data, payload.user, payload.requestId)
      .then((data) => {
        this.notifyFileEvent("files:file:updated")
        return { data }
      })
  }

  private delete(payload: iContracts.iRequestContextPayload<iSharedFiles.DeleteFilePayloadDto>): Promise<iContracts.iControllerResult<iSharedFiles.DeleteFileResponseDto>> {
    if (!payload.user) throw new Exceptions.ControllerError.UnauthorizedError()
    if (!payload.data) throw new Exceptions.ControllerError.InternalError("Отсутствуют данные запроса")

    return this.service.delete(payload.data, payload.user, payload.requestId)
      .then((data) => {
        this.notifyFileEvent("files:file:deleted")
        return { data }
      })
  }

  private createDocument(payload: iContracts.iRequestContextPayload<iSharedFiles.CreateDocumentPayloadDto>): Promise<iContracts.iControllerResult<iSharedFiles.CreateDocumentResponseDto>> {
    if (!payload.user) throw new Exceptions.ControllerError.UnauthorizedError()
    if (!payload.data) throw new Exceptions.ControllerError.InternalError("Отсутствуют данные запроса")

    return this.service.createDocument(payload.data, payload.user, payload.requestId)
      .then((data) => {
        this.notifyFileEvent("files:document:created")
        return { data }
      })
  }

  private getDocument(payload: iContracts.iRequestContextPayload<iSharedFiles.GetDocumentPayloadDto>): Promise<iContracts.iControllerResult<iSharedFiles.GetDocumentResponseDto>> {
    if (!payload.user) throw new Exceptions.ControllerError.UnauthorizedError()
    if (!payload.data) throw new Exceptions.ControllerError.InternalError("Отсутствуют данные запроса")

    const documentUid = payload.data.documentUid

    if (typeof documentUid !== "string") {
      throw new Exceptions.ControllerError.NotFoundError("Документ не найден")
    }

    return this.service.findDocumentAccessible(documentUid, payload.user)
      .then((document) => ({
        data: this.service.toDocumentDto(document)
      }))
      .catch((error) => {
        throw new Exceptions.ControllerError.NotFoundError("Документ не найден", { cause: error })
      })
  }

  private updateDocument(payload: iContracts.iRequestContextPayload<iSharedFiles.UpdateDocumentPayloadDto>): Promise<iContracts.iControllerResult<iSharedFiles.UpdateDocumentResponseDto>> {
    if (!payload.user) throw new Exceptions.ControllerError.UnauthorizedError()
    if (!payload.data) throw new Exceptions.ControllerError.InternalError("Отсутствуют данные запроса")

    return this.service.updateDocument(payload.data, payload.user, payload.requestId)
      .then((data) => {
        this.notifyFileEvent("files:document:updated")
        return { data }
      })
  }

  private deleteDocument(payload: iContracts.iRequestContextPayload<iSharedFiles.DeleteDocumentPayloadDto>): Promise<iContracts.iControllerResult<iSharedFiles.DeleteDocumentResponseDto>> {
    if (!payload.user) throw new Exceptions.ControllerError.UnauthorizedError()
    if (!payload.data) throw new Exceptions.ControllerError.InternalError("Отсутствуют данные запроса")

    return this.service.deleteDocument(payload.data, payload.user, payload.requestId)
      .then((data) => {
        this.notifyFileEvent("files:document:deleted")
        return { data }
      })
  }

  private exportDocument(payload: iDownloadPayload): Promise<iContracts.iFileControllerResult> {
    if (!payload.user) throw new Exceptions.ControllerError.UnauthorizedError()
    if (!payload.data) throw new Exceptions.ControllerError.InternalError("Отсутствуют данные запроса")

    const documentUid = payload.data.documentUid

    if (typeof documentUid !== "string") {
      throw new Exceptions.ControllerError.NotFoundError("Документ не найден")
    }

    return this.service.exportDocument(documentUid, payload.user)
      .then((exportedDocument) => ({
        file: {
          path: exportedDocument.path,
          originalName: exportedDocument.originalName,
          mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          disposition: "attachment" as const
        }
      }))
      .catch((error) => {
        throw new Exceptions.ControllerError.NotFoundError("Документ не найден", { cause: error })
      })
  }

  private createArchive(payload: iContracts.iRequestContextPayload<iSharedFiles.CreateFilesArchivePayloadDto>): Promise<iContracts.iControllerResult<iSharedFiles.CreateFilesArchiveResponseDto>> {
    if (!payload.user) throw new Exceptions.ControllerError.UnauthorizedError()
    if (!payload.data) throw new Exceptions.ControllerError.InternalError("Отсутствуют данные запроса")

    return this.service.createDownloadArchive(payload.data, payload.user)
      .then((data) => ({ data }))
  }

  private downloadArchive(payload: iArchiveDownloadPayload): Promise<iContracts.iFileControllerResult> {
    if (!payload.user) throw new Exceptions.ControllerError.UnauthorizedError()
    if (!payload.data) throw new Exceptions.ControllerError.InternalError("Отсутствуют данные запроса")

    const archiveUid = payload.data.archiveUid

    if (typeof archiveUid !== "string") {
      throw new Exceptions.ControllerError.NotFoundError("Архив не найден")
    }

    return this.service.findArchive(archiveUid, payload.user)
      .then((metadata) => ({
        file: {
          path: metadata.path,
          originalName: metadata.originalName,
          mimeType: "application/zip",
          disposition: "attachment" as const
        }
      }))
      .catch((error) => {
        throw new Exceptions.ControllerError.NotFoundError("Архив не найден", { cause: error })
      })
  }

  private confirmArchiveDownload(payload: iContracts.iRequestContextPayload<iSharedFiles.ConfirmFilesArchiveDownloadPayloadDto>): Promise<iContracts.iControllerResult<iSharedFiles.ConfirmFilesArchiveDownloadResponseDto>> {
    if (!payload.user) throw new Exceptions.ControllerError.UnauthorizedError()
    if (!payload.data) throw new Exceptions.ControllerError.InternalError("Отсутствуют данные запроса")

    return this.service.confirmArchiveDownload(payload.data, payload.user)
      .then((data) => ({ data }))
  }

  private download(payload: iDownloadPayload): Promise<iContracts.iFileControllerResult> {
    if (!payload.user) throw new Exceptions.ControllerError.UnauthorizedError()
    if (!payload.data) throw new Exceptions.ControllerError.InternalError("Отсутствуют данные запроса")

    const fileUid = payload.data.fileUid

    if (typeof fileUid !== "string") {
      throw new Exceptions.ControllerError.NotFoundError("Файл не найден")
    }

    return this.service.findAccessible(fileUid, payload.user)
      .then((storedFile) => this.toFileResult(storedFile))
      .catch((error) => {
        throw new Exceptions.ControllerError.NotFoundError("Файл не найден", { cause: error })
      })
  }

  private view(payload: iDownloadPayload): Promise<iContracts.iFileControllerResult> {
    if (!payload.user) throw new Exceptions.ControllerError.UnauthorizedError()
    if (!payload.data) throw new Exceptions.ControllerError.InternalError("Отсутствуют данные запроса")

    const fileUid = payload.data.fileUid

    if (typeof fileUid !== "string") {
      throw new Exceptions.ControllerError.NotFoundError("Файл не найден")
    }

    return this.service.findAccessible(fileUid, payload.user)
      .then((storedFile) => {
        if (!this.isViewable(storedFile.mimeType)) {
          throw new Exceptions.ControllerError.NotFoundError("Файл не поддерживает просмотр")
        }

        return this.toFileResult(storedFile, "inline", this.getRangeHeader(payload))
      })
      .catch((error) => {
        if (error instanceof Exceptions.ControllerError.NotFoundError) throw error
        throw new Exceptions.ControllerError.NotFoundError("Файл не найден", { cause: error })
      })
  }

  private preview(payload: iDownloadPayload): Promise<iContracts.iFileControllerResult> {
    if (!payload.user) throw new Exceptions.ControllerError.UnauthorizedError()
    if (!payload.data) throw new Exceptions.ControllerError.InternalError("Отсутствуют данные запроса")

    const fileUid = payload.data.fileUid

    if (typeof fileUid !== "string") {
      throw new Exceptions.ControllerError.NotFoundError("Превью файла не найдено")
    }

    return this.service.findAccessible(fileUid, payload.user)
      .then((storedFile) => this.toPreviewResult(storedFile))
      .catch((error) => {
        throw new Exceptions.ControllerError.NotFoundError("Превью файла не найдено", { cause: error })
      })
  }

  private toFileResult(
    storedFile: iDatabase.Models["StoredFile"]["prototype"],
    disposition: iContracts.iFileControllerResult["file"]["disposition"] = "attachment",
    range?: string
  ): iContracts.iFileControllerResult {
    const metadata = this.service.toUploadedFileDto(storedFile)

    return {
      file: {
        path: this.service.getContentPath(storedFile),
        originalName: metadata.originalName,
        mimeType: metadata.mimeType,
        disposition,
        range
      }
    }
  }

  private getRangeHeader(payload: iDownloadPayload): string | undefined {
    const range = payload.headers.range
    if (Array.isArray(range)) return range[0]
    return range
  }

  private toPreviewResult(storedFile: iDatabase.Models["StoredFile"]["prototype"]): iContracts.iFileControllerResult {
    return {
      file: {
        path: this.service.getPreviewProxyPath(storedFile),
        originalName: `${storedFile.originalName}.preview.jpg`,
        mimeType: "image/jpeg",
        disposition: "inline"
      }
    }
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

  private getDescription(fields: iContracts.iPayload): string | null {
    const description = fields.description

    if (description === undefined || description === null) return null
    if (typeof description !== "string") throw new Exceptions.ControllerError.InternalError("Некорректное описание файла")

    const trimmedDescription = description.trim()
    return trimmedDescription.length ? trimmedDescription : null
  }

  private getOptionalString(value: iContracts.iPayloadValue | undefined): string | null {
    if (value === undefined || value === null) return null
    if (typeof value !== "string") throw new Exceptions.ControllerError.InternalError("Некорректное значение")

    const trimmedValue = value.trim()
    return trimmedValue.length ? trimmedValue : null
  }

  private getVisibility(value: iContracts.iPayloadValue | undefined): iSharedFiles.FileVisibility {
    if (value === "private") return "private"
    return "public"
  }

  private notifyFileEvent(eventName: iSharedFiles.FilesRealtimeEventName): void {
    this.fileEventsGatewayClient?.notify({
      eventName,
      changedAt: new Date().toISOString()
    }).catch(() => undefined)
  }
}
