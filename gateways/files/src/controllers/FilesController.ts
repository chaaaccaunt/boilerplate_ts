import { Exceptions, HTTPController } from "@/libs"
import { FileStorageService } from "@/services/FileStorageService"

interface iUploadPayload extends iContracts.iRequestContextPayload<iContracts.iMultipartPayload> {}

interface iDownloadPayload extends iContracts.iRequestContextPayload<iContracts.iPayload> {}

export class FilesController extends HTTPController {
  private readonly service: FileStorageService

  constructor(models: iDatabase.Models, databaseTools: iLibs.DatabaseServiceTools) {
    super()
    this.service = new FileStorageService(models, databaseTools)

    const uploadRoute: iContracts.iRoute<iContracts.iMultipartPayload, iContracts.iControllerResult<iSharedFiles.UploadResponseDto>> = {
      url: /^\/files\/upload\/?$/,
      method: "POST",
      requireAuthorization: true,
      requestBodyType: "multipart",
      callback: this.handle("upload", this.upload.bind(this))
    }

    const listRoute: iContracts.iRoute<iContracts.iPayload, iContracts.iControllerResult<{ files: iSharedFiles.UploadedFileDto[] }>> = {
      url: /^\/files\/?$/,
      method: "GET",
      requireAuthorization: true,
      callback: this.handle("list", this.list.bind(this))
    }

    const updateRoute: iContracts.iRoute<iSharedFiles.UpdateFilePayloadDto, iContracts.iControllerResult<iSharedFiles.UpdateFileResponseDto>> = {
      url: /^\/files\/?$/,
      method: "PATCH",
      requireAuthorization: true,
      validator: {
        fileUid: { isPrimitive: { string: { minLength: 1, maxLength: 128 } } },
        description: { optional: true, isPrimitive: { string: { minLength: 1, maxLength: 500 } } }
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

    const downloadRoute: iContracts.iRoute<iContracts.iPayload, iContracts.iFileControllerResult> = {
      url: /^\/files\/download(?:\?.*)?$/,
      method: "GET",
      requireAuthorization: true,
      callback: this.handle("download", this.download.bind(this))
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

    this.addRoutes([uploadRoute, listRoute, updateRoute, deleteRoute, downloadRoute, viewRoute, previewRoute])
  }

  private upload(payload: iUploadPayload): Promise<iContracts.iControllerResult<iSharedFiles.UploadResponseDto>> {
    if (!payload.user) throw new Exceptions.ControllerError.UnauthorizedError()
    if (!payload.data) throw new Exceptions.ControllerError.InternalError("Отсутствуют данные multipart-запроса")

    const user = payload.user
    const description = this.getDescription(payload.data.fields)
    return Promise.all(payload.data.files.map((file) => this.service.create(file, description, user.uid, payload.requestId)))
      .then((files) => ({
        data: {
          files
        }
      }))
  }

  private list(payload: iDownloadPayload): Promise<iContracts.iControllerResult<{ files: iSharedFiles.UploadedFileDto[] }>> {
    if (!payload.user) throw new Exceptions.ControllerError.UnauthorizedError()

    return this.service.listOwn(payload.user.uid)
      .then((files) => ({
        data: { files }
      }))
  }

  private update(payload: iContracts.iRequestContextPayload<iSharedFiles.UpdateFilePayloadDto>): Promise<iContracts.iControllerResult<iSharedFiles.UpdateFileResponseDto>> {
    if (!payload.user) throw new Exceptions.ControllerError.UnauthorizedError()
    if (!payload.data) throw new Exceptions.ControllerError.InternalError("Отсутствуют данные запроса")

    return this.service.updateMetadata(payload.data, payload.user.uid, payload.requestId)
      .then((data) => ({ data }))
  }

  private delete(payload: iContracts.iRequestContextPayload<iSharedFiles.DeleteFilePayloadDto>): Promise<iContracts.iControllerResult<iSharedFiles.DeleteFileResponseDto>> {
    if (!payload.user) throw new Exceptions.ControllerError.UnauthorizedError()
    if (!payload.data) throw new Exceptions.ControllerError.InternalError("Отсутствуют данные запроса")

    return this.service.delete(payload.data, payload.user.uid, payload.requestId)
      .then((data) => ({ data }))
  }

  private download(payload: iDownloadPayload): Promise<iContracts.iFileControllerResult> {
    if (!payload.user) throw new Exceptions.ControllerError.UnauthorizedError()
    if (!payload.data) throw new Exceptions.ControllerError.InternalError("Отсутствуют данные запроса")

    const fileUid = payload.data.fileUid

    if (typeof fileUid !== "string") {
      throw new Exceptions.ControllerError.NotFoundError("Файл не найден")
    }

    return this.service.findAccessible(fileUid, payload.user.uid)
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

    return this.service.findAccessible(fileUid, payload.user.uid)
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

    return this.service.findAccessible(fileUid, payload.user.uid)
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
}
