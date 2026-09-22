import { existsSync } from "fs"
import { join } from "path"
import { FilePreviewProxy } from "@/libs"

type StoredFile = iDatabase.Models["StoredFile"]["prototype"]
type StoredFileFolder = iDatabase.Models["StoredFileFolder"]["prototype"]
type StoredDocument = iDatabase.Models["StoredDocument"]["prototype"]
type User = iDatabase.Models["User"]["prototype"]

export class FileDtoMapper {
  private readonly uploadsRoot = join(process.cwd(), "uploads")

  constructor(private readonly previewProxy: FilePreviewProxy) { }

  toFile(file: StoredFile): iSharedFiles.UploadedFileDto {
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
      url: `/v1/gateway/files/download?fileUid=${encodeURIComponent(file.uid)}`,
      viewUrl: this.getViewUrl(file),
      previewUrl: this.getPreviewUrl(file)
    }
  }

  toDocument(document: StoredDocument): iSharedFiles.StoredDocumentDto {
    return {
      ...this.toDocumentListItem(document),
      contentJson: document.contentJson,
      contentHtml: document.contentHtml
    }
  }

  toDocumentListItem(document: StoredDocument): iSharedFiles.StoredDocumentListItemDto {
    return {
      documentUid: document.uid,
      title: document.title,
      folderUid: document.folderUid,
      visibility: document.visibility,
      status: document.status,
      createdByUserUid: document.createdByUserUid,
      createdAt: document.createdAt.toISOString(),
      updatedAt: document.updatedAt.toISOString(),
      finalizedAt: document.finalizedAt ? document.finalizedAt.toISOString() : null,
      exportUrl: `/v1/gateway/files/documents/export?documentUid=${encodeURIComponent(document.uid)}`
    }
  }

  toFolder(folder: StoredFileFolder): iSharedFiles.FileFolderDto {
    return {
      uid: folder.uid,
      title: folder.title,
      parentFolderUid: folder.parentFolderUid,
      visibility: folder.visibility,
      createdByUserUid: folder.createdByUserUid,
      createdAt: folder.createdAt.toISOString(),
      updatedAt: folder.updatedAt.toISOString()
    }
  }

  toOwner(user: User): iSharedFiles.FileOwnerDto {
    return { userUid: user.uid, fullName: user.fullName, login: user.login }
  }

  getArchiveDownloadUrl(archiveUid: string): string {
    return `/v1/gateway/files/archives/download?archiveUid=${encodeURIComponent(archiveUid)}`
  }

  private getViewUrl(file: StoredFile): string | null {
    if (!this.isViewable(file.mimeType)) return null
    return `/v1/gateway/files/view?fileUid=${encodeURIComponent(file.uid)}`
  }

  private getPreviewUrl(file: StoredFile): string | null {
    if (!this.previewProxy.supports(file.mimeType)) return null
    if (!existsSync(join(this.uploadsRoot, this.getSafeStoragePath(file.storagePath), "preview.jpg"))) return null
    return `/v1/gateway/files/preview?fileUid=${encodeURIComponent(file.uid)}`
  }

  private isViewable(mimeType: string): boolean {
    return ["image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf", "video/mp4", "video/webm", "video/ogg"].includes(mimeType)
  }

  private getSafeStoragePath(storagePath: string): string {
    if (!/^\d{4}\/\d{2}\/\d{2}\/[0-9a-f-]{36}$/i.test(storagePath)) throw new Error("Некорректный путь хранения файла")
    return storagePath
  }
}
