import { join } from "path"

export class FileStorageService {
  private readonly uploadsRoot = join(process.cwd(), "uploads")

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
      createdByUserUid
    })
      .then((storedFile) => this.toUploadedFileDto(storedFile))
  }

  find(fileUid: string): Promise<iDatabase.Models["StoredFile"]["prototype"]> {
    return this.model.findByPk(fileUid)
      .then((storedFile) => {
        if (!storedFile) {
          throw new Error("Файл не найден")
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
      url: this.getDownloadUrl(file.uid)
    }
  }

  private getDownloadUrl(fileUid: string): string {
    return `/v1/gateway/files/download?fileUid=${encodeURIComponent(fileUid)}`
  }

  private getSafeStoragePath(storagePath: string): string {
    if (!/^\d{4}\/\d{2}\/\d{2}\/[0-9a-f-]{36}$/i.test(storagePath)) {
      throw new Error("Некорректный путь хранения файла")
    }

    return storagePath
  }
}
