import { Exceptions } from "@/libs"
import { FileStorageService } from "@/services/FileStorageService"
import { BaseController } from "./BaseController"

interface iUploadPayload {
  user?: iContracts.iUserToken
  data?: iContracts.iMultipartPayload
}

interface iDownloadPayload {
  user?: iContracts.iUserToken
  data?: iContracts.iPayload
}

export class FilesController extends BaseController {
  private readonly service: FileStorageService

  constructor(models: iDatabase.Models) {
    super()
    this.service = new FileStorageService(models)

    const uploadRoute: iContracts.iRoute<iContracts.iMultipartPayload, iContracts.iControllerResult<iSharedFiles.UploadResponseDto>> = {
      url: /^\/files\/upload\/?$/,
      method: "POST",
      requireAuthorization: true,
      requestBodyType: "multipart",
      callback: this.handle("upload", this.upload.bind(this))
    }

    const downloadRoute: iContracts.iRoute<iContracts.iPayload, iContracts.iFileControllerResult> = {
      url: /^\/files\/download(?:\?.*)?$/,
      method: "GET",
      requireAuthorization: true,
      callback: this.handle("download", this.download.bind(this))
    }

    this.addRoutes([uploadRoute, downloadRoute])
  }

  private upload(payload: iUploadPayload): Promise<iContracts.iControllerResult<iSharedFiles.UploadResponseDto>> {
    if (!payload.user) throw new Exceptions.ControllerError.UnauthorizedError()
    if (!payload.data) throw new Exceptions.ControllerError.InternalError("Отсутствуют данные multipart-запроса")

    const user = payload.user
    const description = this.getDescription(payload.data.fields)
    return Promise.all(payload.data.files.map((file) => this.service.create(file, description, user.uid)))
      .then((files) => ({
        data: {
          files
        }
      }))
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

  private toFileResult(storedFile: iDatabase.Models["StoredFile"]["prototype"]): iContracts.iFileControllerResult {
    const metadata = this.service.toUploadedFileDto(storedFile)

    return {
      file: {
        path: this.service.getContentPath(storedFile),
        originalName: metadata.originalName,
        mimeType: metadata.mimeType
      }
    }
  }

  private getDescription(fields: iContracts.iPayload): string | null {
    const description = fields.description

    if (description === undefined || description === null) return null
    if (typeof description !== "string") throw new Exceptions.ControllerError.InternalError("Некорректное описание файла")

    const trimmedDescription = description.trim()
    return trimmedDescription.length ? trimmedDescription : null
  }
}
