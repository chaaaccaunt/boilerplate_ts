import type { UUID } from "crypto"
import { mkdir, writeFile } from "fs/promises"
import { tmpdir } from "os"
import { extname, join } from "path"
import { Exceptions, FilePreviewProxy, Logger } from "@/libs"
import { DocumentExportService } from "./DocumentExportService"
import { FileDtoMapper } from "./FileDtoMapper"
import { FileAccessPolicy } from "./FileAccessPolicy"
import { FileArchiveService, ArchiveMetadata } from "./FileArchiveService"

type StoredFile = iDatabase.Models["StoredFile"]["prototype"]
type StoredFileFolder = iDatabase.Models["StoredFileFolder"]["prototype"]
type StoredDocument = iDatabase.Models["StoredDocument"]["prototype"]

export class FileStorageService {
  private readonly uploadsRoot = join(process.cwd(), "uploads")
  private readonly documentsExportRoot = join(tmpdir(), "boilerplate-documents-export")
  constructor(
    private readonly models: iDatabase.Models,
    private readonly databaseTools: iLibs.DatabaseServiceTools,
    private readonly previewProxy: FilePreviewProxy,
    private readonly logger: Logger,
    private readonly documentExportService: DocumentExportService,
    private readonly dtoMapper: FileDtoMapper,
    private readonly accessPolicy: FileAccessPolicy,
    private readonly archiveService: FileArchiveService
  ) { }

  create(
    file: iContracts.iUploadedFile,
    description: string | null,
    folderUid: string | null,
    visibility: iSharedFiles.FileVisibility,
    createdByUserUid: iContracts.iUserToken["uid"],
    user: iContracts.iUserToken,
    requestId?: string
  ): Promise<iSharedFiles.UploadedFileDto> {
    const normalizedFile = this.normalizeUploadedFile(file)

    return this.accessPolicy.assertCanUseFolder(folderUid, user)
      .then(() => this.models.StoredFile.create({
        originalName: normalizedFile.originalName,
        mimeType: normalizedFile.mimeType,
        size: normalizedFile.size,
        description,
        storagePath: normalizedFile.storagePath,
        folderUid: folderUid as UUID | null,
        visibility,
        createdByUserUid
      }, {
        logging: this.createMutationQueryLogger("create", "stored_files insert query", requestId)
      }))
      .then((storedFile) => this.createPreviewProxy(normalizedFile)
        .catch((error) => {
          this.logger.warn("Не удалось создать proxy-файл превью", {
            serviceName: this.constructor.name,
            serviceMethod: "create",
            error
          })
        })
        .then(() => storedFile))
      .then((storedFile) => this.dtoMapper.toFile(storedFile))
  }

  listContent(payload: iSharedFiles.ListFolderContentPayloadDto, user: iContracts.iUserToken): Promise<iSharedFiles.ListFolderContentResponseDto> {
    const folderUid = payload.folderUid || null
    const ownerUserUid = payload.ownerUserUid || null

    return this.resolveCurrentFolder(folderUid, ownerUserUid, user)
      .then((folder) => this.resolveOwner(ownerUserUid || folder?.createdByUserUid || user.uid)
        .then((owner) => Promise.all([
          this.listFoldersByParent(folderUid, owner.userUid, user),
          this.listFilesByFolder(folderUid, owner.userUid, user),
          this.listDocumentsByFolder(folderUid, owner.userUid, user),
          this.getBreadcrumbs(folder)
        ])
          .then(([folders, files, documents, breadcrumbs]) => ({
            owner,
            folder: folder ? this.dtoMapper.toFolder(folder) : null,
            folders,
            files,
            documents,
            breadcrumbs
          }))))
  }

  listOwners(user: iContracts.iUserToken, payload: iSharedFiles.ListFileOwnersPayloadDto = {}): Promise<iSharedFiles.ListFileOwnersResponseDto> {
    const limit = Math.min(Math.max(payload.limit ?? 25, 1), 100)
    const offset = Math.max(payload.offset ?? 0, 0)

    return this.models.User.findAndCountAll({
      limit,
      offset,
      order: [["lastName", "ASC"], ["firstName", "ASC"], ["login", "ASC"]]
    })
      .then(({ count, rows }) => ({
        owners: rows.map((item) => this.dtoMapper.toOwner(item)),
        total: count,
        limit,
        offset
      }))
  }

  createFolder(payload: iSharedFiles.CreateFileFolderPayloadDto, user: iContracts.iUserToken, requestId?: string): Promise<iSharedFiles.CreateFileFolderResponseDto> {
    const title = this.normalizeTitle(payload.title)
    const parentFolderUid = payload.parentFolderUid || null
    const visibility = this.normalizeVisibility(payload.visibility)

    return this.accessPolicy.assertCanUseFolder(parentFolderUid, user)
      .then(() => this.models.StoredFileFolder.create({
        title,
        parentFolderUid: parentFolderUid as UUID | null,
        visibility,
        createdByUserUid: user.uid
      }, {
        logging: this.createMutationQueryLogger("createFolder", "stored_file_folders insert query", requestId)
      }))
      .then((folder) => this.dtoMapper.toFolder(folder))
  }

  updateFolder(payload: iSharedFiles.UpdateFileFolderPayloadDto, user: iContracts.iUserToken, requestId?: string): Promise<iSharedFiles.UpdateFileFolderResponseDto> {
    return this.findFolder(payload.folderUid)
      .then((folder) => this.accessPolicy.assertCanManage(folder, user)
        .then(() => this.resolveFolderPatch(folder, payload, user))
        .then((patch) => folder.update(patch, {
          logging: this.createMutationQueryLogger("updateFolder", "stored_file_folders update query", requestId)
        })))
      .then((folder) => this.dtoMapper.toFolder(folder))
  }

  deleteFolder(payload: iSharedFiles.DeleteFileFolderPayloadDto, user: iContracts.iUserToken, requestId?: string): Promise<iSharedFiles.DeleteFileFolderResponseDto> {
    return this.findFolder(payload.folderUid)
      .then((folder) => this.accessPolicy.assertCanManage(folder, user)
        .then(() => this.assertFolderIsEmpty(folder.uid))
        .then(() => folder.destroy({
          logging: this.createMutationQueryLogger("deleteFolder", "stored_file_folders delete query", requestId)
        })))
      .then(() => ({ folderUid: payload.folderUid }))
  }

  updateMetadata(payload: iSharedFiles.UpdateFilePayloadDto, user: iContracts.iUserToken, requestId?: string): Promise<iSharedFiles.UpdateFileResponseDto> {
    return this.findFileForManage(payload.fileUid, user)
      .then((storedFile) => this.resolveFilePatch(payload, user)
        .then((patch) => storedFile.update(patch, {
          logging: this.createMutationQueryLogger("updateMetadata", "stored_files update query", requestId)
        })))
      .then((storedFile) => this.dtoMapper.toFile(storedFile))
  }

  delete(payload: iSharedFiles.DeleteFilePayloadDto, user: iContracts.iUserToken, requestId?: string): Promise<iSharedFiles.DeleteFileResponseDto> {
    return this.findFileForManage(payload.fileUid, user)
      .then((storedFile) => this.assertFileHasNoChatAttachments(storedFile.uid)
        .then(() => storedFile.destroy({
          logging: this.createMutationQueryLogger("delete", "stored_files delete query", requestId)
        })))
      .then(() => ({ fileUid: payload.fileUid }))
  }

  createDocument(payload: iSharedFiles.CreateDocumentPayloadDto, user: iContracts.iUserToken, requestId?: string): Promise<iSharedFiles.CreateDocumentResponseDto> {
    const title = this.normalizeDocumentTitle(payload.title)
    const folderUid = payload.folderUid || null
    const visibility = this.normalizeVisibility(payload.visibility)

    return this.accessPolicy.assertCanUseFolder(folderUid, user)
      .then(() => this.models.StoredDocument.create({
        title,
        contentJson: this.documentExportService.createEmptyDocumentJson(),
        contentHtml: "<p></p>",
        folderUid: folderUid as UUID | null,
        visibility,
        status: "draft",
        finalizedAt: null,
        createdByUserUid: user.uid
      }, {
        logging: this.createMutationQueryLogger("createDocument", "stored_documents insert query", requestId)
      }))
      .then((document) => this.dtoMapper.toDocument(document))
  }

  findDocumentAccessible(documentUid: string, user: iContracts.iUserToken): Promise<StoredDocument> {
    return this.findDocument(documentUid)
      .then((document) => this.accessPolicy.canReadFile(document, user)
        .then((canRead) => {
          if (!canRead) {
            throw new Exceptions.ServiceError.AuthenticationError("Нет доступа к документу")
          }

          return document
        }))
  }

  updateDocument(payload: iSharedFiles.UpdateDocumentPayloadDto, user: iContracts.iUserToken, requestId?: string): Promise<iSharedFiles.UpdateDocumentResponseDto> {
    return this.findDocumentForManage(payload.documentUid, user)
      .then((document) => this.resolveDocumentPatch(document, payload, user)
          .then((patch) => document.update(patch, {
            logging: this.createMutationQueryLogger("updateDocument", "stored_documents update query", requestId)
          })))
      .then((document) => this.dtoMapper.toDocument(document))
  }

  deleteDocument(payload: iSharedFiles.DeleteDocumentPayloadDto, user: iContracts.iUserToken, requestId?: string): Promise<iSharedFiles.DeleteDocumentResponseDto> {
    return this.findDocumentForManage(payload.documentUid, user)
      .then((document) => document.destroy({
        logging: this.createMutationQueryLogger("deleteDocument", "stored_documents delete query", requestId)
      }))
      .then(() => ({ documentUid: payload.documentUid }))
  }

  exportDocument(documentUid: string, user: iContracts.iUserToken): Promise<{ path: string, originalName: string }> {
    return this.findDocumentAccessible(documentUid, user)
      .then((document) => mkdir(this.documentsExportRoot, { recursive: true })
        .then(() => this.documentExportService.create(document))
        .then((content) => {
          const path = join(this.documentsExportRoot, `${document.uid}.docx`)
          return writeFile(path, content)
            .then(() => ({
              path,
              originalName: `${this.documentExportService.getSafeFileName(document.title)}.docx`
            }))
        }))
  }

  createDownloadArchive(payload: iSharedFiles.CreateFilesArchivePayloadDto, user: iContracts.iUserToken): Promise<iSharedFiles.CreateFilesArchiveResponseDto> {
    return this.archiveService.create(payload, user)
  }

  findArchive(archiveUid: string, user: iContracts.iUserToken): Promise<ArchiveMetadata> {
    return this.archiveService.find(archiveUid, user)
  }

  confirmArchiveDownload(payload: iSharedFiles.ConfirmFilesArchiveDownloadPayloadDto, user: iContracts.iUserToken): Promise<iSharedFiles.ConfirmFilesArchiveDownloadResponseDto> {
    return this.archiveService.confirmDownload(payload, user)
  }

  find(fileUid: string): Promise<StoredFile> {
    return this.models.StoredFile.findByPk(fileUid)
      .then((storedFile) => {
        if (!storedFile) {
          throw new Exceptions.ServiceError.NotFoundError("Файл не найден")
        }

        return storedFile
      })
  }

  findAccessible(fileUid: string, user: iContracts.iUserToken): Promise<StoredFile> {
    return this.find(fileUid)
      .then((storedFile) => this.accessPolicy.canReadFile(storedFile, user)
        .then((canRead) => {
          if (!canRead) {
            throw new Exceptions.ServiceError.AuthenticationError("Нет доступа к файлу")
          }

          return storedFile
        }))
  }

  findFileForManage(fileUid: string, user: iContracts.iUserToken): Promise<StoredFile> {
    return this.find(fileUid)
      .then((storedFile) => this.accessPolicy.assertCanManage(storedFile, user)
        .then(() => storedFile))
  }

  private findFolder(folderUid: string): Promise<StoredFileFolder> {
    return this.models.StoredFileFolder.findByPk(folderUid)
      .then((folder) => {
        if (!folder) {
          throw new Exceptions.ServiceError.NotFoundError("Папка не найдена")
        }

        return folder
      })
  }

  private findDocument(documentUid: string): Promise<StoredDocument> {
    return this.models.StoredDocument.findByPk(documentUid)
      .then((document) => {
        if (!document) {
          throw new Exceptions.ServiceError.NotFoundError("Документ не найден")
        }

        return document
      })
  }

  private findDocumentForManage(documentUid: string, user: iContracts.iUserToken): Promise<StoredDocument> {
    return this.findDocument(documentUid)
      .then((document) => this.accessPolicy.assertCanManage(document, user)
        .then(() => document))
  }

  private findOwned(fileUid: string, userUid: string): Promise<StoredFile> {
    return this.find(fileUid)
      .then((storedFile) => {
        if (storedFile.createdByUserUid !== userUid) {
          throw new Exceptions.ServiceError.AuthenticationError("Нет доступа к файлу")
        }

        return storedFile
      })
  }

  getContentPath(storedFile: StoredFile): string {
    return join(this.uploadsRoot, this.getSafeStoragePath(storedFile.storagePath), "content")
  }

  getPreviewProxyPath(storedFile: StoredFile): string {
    return join(this.uploadsRoot, this.getSafeStoragePath(storedFile.storagePath), "preview.jpg")
  }
  private createPreviewProxy(file: iContracts.iUploadedFile): Promise<void> {
    return this.previewProxy.create({
      sourcePath: join(this.uploadsRoot, this.getSafeStoragePath(file.storagePath), "content"),
      targetPath: join(this.uploadsRoot, this.getSafeStoragePath(file.storagePath), "preview.jpg"),
      mimeType: file.mimeType
    })
      .then(() => undefined)
  }

  private normalizeUploadedFile(file: iContracts.iUploadedFile): iContracts.iUploadedFile {
    const extensionByMimeType: Readonly<Record<string, string>> = {
      "image/gif": ".gif",
      "image/jpeg": ".jpg",
      "image/png": ".png",
      "image/webp": ".webp"
    }
    const mimeTypeByExtension: Readonly<Record<string, string>> = {
      ".gif": "image/gif",
      ".jpeg": "image/jpeg",
      ".jpg": "image/jpeg",
      ".png": "image/png",
      ".webp": "image/webp"
    }
    const currentExtension = extname(file.originalName).toLowerCase()
    const mimeType = (!file.mimeType || file.mimeType === "application/octet-stream")
      ? mimeTypeByExtension[currentExtension] || file.mimeType || "application/octet-stream"
      : file.mimeType
    const expectedExtension = extensionByMimeType[mimeType]
    const originalName = !currentExtension && expectedExtension ? `${file.originalName}${expectedExtension}` : file.originalName

    return { ...file, originalName, mimeType }
  }

  private assertFileHasNoChatAttachments(fileUid: UUID): Promise<void> {
    return this.models.ChatMessageFile.count({ where: { storedFileUid: fileUid } })
      .then((attachmentsCount) => {
        if (attachmentsCount > 0) {
          throw new Exceptions.ServiceError.ConflictError("Нельзя удалить файл, который прикреплен к сообщению")
        }
      })
  }

  private resolveCurrentFolder(folderUid: string | null, ownerUserUid: string | null, user: iContracts.iUserToken): Promise<StoredFileFolder | null> {
    if (!folderUid) return Promise.resolve(null)

    return this.findFolder(folderUid)
      .then((folder) => this.accessPolicy.canReadFolder(folder, user)
        .then((canRead) => {
          if (!canRead || (ownerUserUid && folder.createdByUserUid !== ownerUserUid)) {
            throw new Exceptions.ServiceError.AuthenticationError("Нет доступа к папке")
          }

          return folder
        }))
  }

  private listFoldersByParent(parentFolderUid: string | null, ownerUserUid: string, user: iContracts.iUserToken): Promise<iSharedFiles.FileFolderDto[]> {
    return this.models.StoredFileFolder.findAll({
      where: { parentFolderUid, createdByUserUid: ownerUserUid },
      order: [["title", "ASC"]]
    })
      .then((folders) => this.filterFoldersByAccess(folders, user))
      .then((folders) => folders.map((folder) => this.dtoMapper.toFolder(folder)))
  }

  private listFilesByFolder(folderUid: string | null, ownerUserUid: string, user: iContracts.iUserToken): Promise<iSharedFiles.UploadedFileDto[]> {
    return this.models.StoredFile.findAll({
      where: { folderUid, createdByUserUid: ownerUserUid },
      order: [["createdAt", "DESC"]]
    })
      .then((files) => this.filterFilesByAccess(files, user))
      .then((files) => files.map((file) => this.dtoMapper.toFile(file)))
  }

  private listDocumentsByFolder(folderUid: string | null, ownerUserUid: string, user: iContracts.iUserToken): Promise<iSharedFiles.StoredDocumentListItemDto[]> {
    return this.models.StoredDocument.findAll({
      where: { folderUid, createdByUserUid: ownerUserUid },
      order: [["updatedAt", "DESC"]]
    })
      .then((documents) => documents.filter((document) => this.accessPolicy.canReadListedItem(document, user)))
      .then((documents) => documents.map((document) => this.dtoMapper.toDocumentListItem(document)))
  }

  private filterFoldersByAccess(folders: StoredFileFolder[], user: iContracts.iUserToken): Promise<StoredFileFolder[]> {
    return Promise.resolve(folders.filter((folder) => this.accessPolicy.canReadListedItem(folder, user)))
  }

  private filterFilesByAccess(files: StoredFile[], user: iContracts.iUserToken): Promise<StoredFile[]> {
    return Promise.resolve(files.filter((file) => this.accessPolicy.canReadListedItem(file, user)))
  }
  private resolveFilePatch(payload: iSharedFiles.UpdateFilePayloadDto, user: iContracts.iUserToken): Promise<Partial<StoredFile>> {
    const patch: Partial<StoredFile> = {}

    if ("description" in payload) {
      patch.description = payload.description?.trim() || null
    }

    if ("visibility" in payload) {
      patch.visibility = this.normalizeVisibility(payload.visibility)
    }

    if ("folderUid" in payload) {
      const folderUid = payload.folderUid || null
      patch.folderUid = folderUid as UUID | null

      return this.accessPolicy.assertCanUseFolder(folderUid, user).then(() => patch)
    }

    return Promise.resolve(patch)
  }

  private resolveFolderPatch(folder: StoredFileFolder, payload: iSharedFiles.UpdateFileFolderPayloadDto, user: iContracts.iUserToken): Promise<Partial<StoredFileFolder>> {
    const patch: Partial<StoredFileFolder> = {}

    if ("title" in payload && payload.title !== undefined) {
      patch.title = this.normalizeTitle(payload.title)
    }

    if ("visibility" in payload) {
      patch.visibility = this.normalizeVisibility(payload.visibility)
    }

    if ("parentFolderUid" in payload) {
      const parentFolderUid = payload.parentFolderUid || null

      return this.assertCanMoveFolder(folder, parentFolderUid, user)
        .then(() => {
          patch.parentFolderUid = parentFolderUid as UUID | null
          return patch
        })
    }

    return Promise.resolve(patch)
  }

  private assertCanMoveFolder(folder: StoredFileFolder, parentFolderUid: string | null, user: iContracts.iUserToken): Promise<void> {
    if (!parentFolderUid) return Promise.resolve()
    if (parentFolderUid === folder.uid) {
      throw new Exceptions.ServiceError.ConflictError("Нельзя переместить папку внутрь самой себя")
    }

    return this.accessPolicy.assertCanUseFolder(parentFolderUid, user)
      .then(() => this.isFolderDescendant(parentFolderUid, folder.uid))
      .then((isDescendant) => {
        if (isDescendant) {
          throw new Exceptions.ServiceError.ConflictError("Нельзя переместить папку внутрь вложенной папки")
        }
      })
  }

  private isFolderDescendant(folderUid: string, possibleParentUid: string): Promise<boolean> {
    return this.findFolder(folderUid)
      .then((folder) => {
        if (!folder.parentFolderUid) return false
        if (folder.parentFolderUid === possibleParentUid) return true

        return this.isFolderDescendant(folder.parentFolderUid, possibleParentUid)
      })
  }

  private assertFolderIsEmpty(folderUid: UUID): Promise<void> {
    return Promise.all([
      this.models.StoredFile.count({ where: { folderUid } }),
      this.models.StoredFileFolder.count({ where: { parentFolderUid: folderUid } }),
      this.models.StoredDocument.count({ where: { folderUid } })
    ])
      .then(([filesCount, foldersCount, documentsCount]) => {
        if (filesCount || foldersCount || documentsCount) {
          throw new Exceptions.ServiceError.ConflictError("Можно удалить только пустую папку")
        }
      })
  }

  private getBreadcrumbs(folder: StoredFileFolder | null): Promise<iSharedFiles.FileFolderDto[]> {
    if (!folder) return Promise.resolve([])

    return this.getParentBreadcrumbs(folder.parentFolderUid)
      .then((breadcrumbs) => breadcrumbs.concat(this.dtoMapper.toFolder(folder)))
  }

  private getParentBreadcrumbs(parentFolderUid: UUID | null): Promise<iSharedFiles.FileFolderDto[]> {
    if (!parentFolderUid) return Promise.resolve([])

    return this.findFolder(parentFolderUid)
      .then((folder) => this.getParentBreadcrumbs(folder.parentFolderUid)
        .then((breadcrumbs) => breadcrumbs.concat(this.dtoMapper.toFolder(folder))))
  }

  private resolveOwner(userUid: string): Promise<iSharedFiles.FileOwnerDto> {
    return this.models.User.findByPk(userUid)
      .then((user) => {
        if (!user) throw new Exceptions.ServiceError.NotFoundError("Пользователь не найден")
        return this.dtoMapper.toOwner(user)
      })
  }
  private normalizeTitle(title: string): string {
    const trimmedTitle = title.trim()
    if (!trimmedTitle) throw new Exceptions.ServiceError.ConflictError("Название папки не может быть пустым")

    return trimmedTitle
  }

  private normalizeDocumentTitle(title: string): string {
    const trimmedTitle = title.trim()
    if (!trimmedTitle) throw new Exceptions.ServiceError.ConflictError("Название документа не может быть пустым")

    return trimmedTitle
  }

  private normalizeVisibility(value: unknown): iSharedFiles.FileVisibility {
    if (value === "public" || value === undefined) return "public"
    if (value === "private") return "private"

    throw new Exceptions.ServiceError.ConflictError("Некорректная видимость файла")
  }

  private normalizeDocumentStatus(value: unknown): iSharedFiles.StoredDocumentStatus {
    if (value === "draft" || value === undefined) return "draft"
    if (value === "final") return "final"

    throw new Exceptions.ServiceError.ConflictError("Некорректный статус документа")
  }

  private resolveDocumentPatch(document: StoredDocument, payload: iSharedFiles.UpdateDocumentPayloadDto, user: iContracts.iUserToken): Promise<Partial<StoredDocument>> {
    const patch: Partial<StoredDocument> = {}

    if ("title" in payload && payload.title !== undefined) {
      patch.title = this.normalizeDocumentTitle(payload.title)
    }

    if ("contentJson" in payload && payload.contentJson !== undefined) {
      patch.contentJson = this.normalizeDocumentContent(payload.contentJson, "JSON документа")
    }

    if ("contentHtml" in payload && payload.contentHtml !== undefined) {
      patch.contentHtml = this.normalizeDocumentContent(payload.contentHtml, "HTML документа")
    }

    if ("visibility" in payload) {
      patch.visibility = this.normalizeVisibility(payload.visibility)
    }

    if ("status" in payload) {
      patch.status = this.normalizeDocumentStatus(payload.status)
      patch.finalizedAt = patch.status === "final" && document.status !== "final" ? new Date() : document.finalizedAt
    }

    if ("folderUid" in payload) {
      const folderUid = payload.folderUid || null
      patch.folderUid = folderUid as UUID | null

      return this.accessPolicy.assertCanUseFolder(folderUid, user).then(() => patch)
    }

    return Promise.resolve(patch)
  }

  private normalizeDocumentContent(value: string, fieldName: string): string {
    if (value.length > 5 * 1024 * 1024) {
      throw new Exceptions.ServiceError.ConflictError(`${fieldName} слишком большой`)
    }

    return value
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
