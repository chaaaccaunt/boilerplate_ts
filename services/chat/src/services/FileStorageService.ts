import { join } from "path"
import { Exceptions, FilePreviewProxy } from "@/libs"

export class FileStorageService {
  private readonly uploadsRoot = join(process.cwd(), "uploads")
  private readonly previewProxy = new FilePreviewProxy()

  constructor(private readonly model: iDatabase.Models["StoredFile"]) { }

  create(
    file: iContracts.iUploadedFile,
    description: string | null,
    createdByUserUid: iContracts.iUserToken["uid"]
  ): Promise<iSharedFiles.UploadedFileDto> {
    return this.model.create({
      originalName: file.originalName,
      mimeType: file.mimeType,
      size: file.size,
      description,
      storagePath: file.storagePath,
      folderUid: null,
      visibility: "public",
      createdByUserUid
    })
      .then((storedFile) => this.toUploadedFileDto(storedFile))
  }

  find(fileUid: string): Promise<iDatabase.Models["StoredFile"]["prototype"]> {
    return this.model.findByPk(fileUid)
      .then((storedFile) => {
        if (!storedFile) {
          throw new Exceptions.ServiceError.NotFoundError("File not found")
        }

        return storedFile
      })
  }

  findOwned(fileUid: string, userUid: string): Promise<iDatabase.Models["StoredFile"]["prototype"]> {
    return this.find(fileUid)
      .then((storedFile) => {
        if (storedFile.createdByUserUid !== userUid) {
          throw new Exceptions.ServiceError.AuthenticationError("File is not owned by user")
        }

        return storedFile
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
      folderUid: file.folderUid,
      visibility: file.visibility,
      createdByUserUid: file.createdByUserUid,
      createdAt: file.createdAt.toISOString(),
      updatedAt: file.updatedAt.toISOString(),
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

  private getSafeStoragePath(storagePath: string): string {
    if (!/^\d{4}\/\d{2}\/\d{2}\/[0-9a-f-]{36}$/i.test(storagePath)) {
      throw new Error("Invalid file storage path")
    }

    return storagePath
  }
}
