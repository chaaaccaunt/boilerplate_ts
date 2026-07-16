import { randomUUID } from "crypto"
import type { UUID } from "crypto"
import { existsSync } from "fs"
import { mkdir, readdir, readFile, rm, stat, writeFile } from "fs/promises"
import { tmpdir } from "os"
import { join } from "path"
import {
  AlignmentType,
  Document as DocxDocument,
  ExternalHyperlink,
  Footer,
  HeadingLevel,
  ImageRun,
  LineRuleType,
  Packer,
  PageBreak,
  PageNumber,
  Paragraph,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  UnderlineType,
  WidthType
} from "docx"
import type { ParagraphChild } from "docx"
import { Exceptions, FilePreviewProxy, Logger } from "@/libs"

type StoredFile = iDatabase.Models["StoredFile"]["prototype"]
type StoredFileFolder = iDatabase.Models["StoredFileFolder"]["prototype"]
type StoredDocument = iDatabase.Models["StoredDocument"]["prototype"]

interface ArchiveMetadata {
  archiveUid: string
  createdByUserUid: string
  createdAt: string
  originalName: string
  path: string
}

interface ZipEntry {
  name: string
  content: Buffer
  date: Date
}

interface TipTapNode {
  type?: string
  text?: string
  attrs?: Record<string, unknown>
  marks?: TipTapMark[]
  content?: TipTapNode[]
}

interface DocumentPageMargins {
  top: number
  right: number
  bottom: number
  left: number
}

const defaultDocumentPageMargins: DocumentPageMargins = {
  top: 18,
  right: 20,
  bottom: 18,
  left: 20
}
const documentPageWidthMillimeters = 210
const documentPageHeightMillimeters = 297
const minimumDocumentContentSizeMillimeters = 10

interface TipTapMark {
  type?: string
  attrs?: Record<string, unknown>
}

const MAX_ZIP_UINT32 = 0xffffffff
const TEMP_ARCHIVE_TTL_MS = 1000 * 60 * 60 * 6
const CRC32_TABLE = Array.from({ length: 256 }, (_, index) => {
  let value = index

  for (let bit = 0; bit < 8; bit++) {
    value = (value & 1) ? (0xedb88320 ^ (value >>> 1)) : (value >>> 1)
  }

  return value >>> 0
})

export class FileStorageService {
  private readonly uploadsRoot = join(process.cwd(), "uploads")
  private readonly archivesRoot = join(tmpdir(), "boilerplate-files-archives")
  private readonly documentsExportRoot = join(tmpdir(), "boilerplate-documents-export")
  private readonly previewProxy = new FilePreviewProxy()
  private readonly logger = new Logger()

  constructor(
    private readonly models: iDatabase.Models,
    private readonly databaseTools: iLibs.DatabaseServiceTools
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
    return this.assertCanUseFolder(folderUid, user)
      .then(() => this.models.StoredFile.create({
        originalName: file.originalName,
        mimeType: file.mimeType,
        size: file.size,
        description,
        storagePath: file.storagePath,
        folderUid: folderUid as UUID | null,
        visibility,
        createdByUserUid
      }, {
        logging: this.createMutationQueryLogger("create", "stored_files insert query", requestId)
      }))
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
          folder: folder ? this.toFolderDto(folder) : null,
          folders,
          files,
          documents,
          breadcrumbs
          }))))
  }

  listOwners(user: iContracts.iUserToken): Promise<iSharedFiles.ListFileOwnersResponseDto> {
    return this.models.User.findAll({
      order: [["lastName", "ASC"], ["firstName", "ASC"], ["login", "ASC"]]
    })
      .then((users) => ({
        owners: users.map((item) => this.toOwnerDto(item))
      }))
  }

  createFolder(payload: iSharedFiles.CreateFileFolderPayloadDto, user: iContracts.iUserToken, requestId?: string): Promise<iSharedFiles.CreateFileFolderResponseDto> {
    const title = this.normalizeTitle(payload.title)
    const parentFolderUid = payload.parentFolderUid || null
    const visibility = this.normalizeVisibility(payload.visibility)

    return this.assertCanUseFolder(parentFolderUid, user)
      .then(() => this.models.StoredFileFolder.create({
        title,
        parentFolderUid: parentFolderUid as UUID | null,
        visibility,
        createdByUserUid: user.uid
      }, {
        logging: this.createMutationQueryLogger("createFolder", "stored_file_folders insert query", requestId)
      }))
      .then((folder) => this.toFolderDto(folder))
  }

  updateFolder(payload: iSharedFiles.UpdateFileFolderPayloadDto, user: iContracts.iUserToken, requestId?: string): Promise<iSharedFiles.UpdateFileFolderResponseDto> {
    return this.findFolder(payload.folderUid)
      .then((folder) => this.assertCanManage(folder, user)
        .then(() => this.resolveFolderPatch(folder, payload, user))
        .then((patch) => folder.update(patch, {
          logging: this.createMutationQueryLogger("updateFolder", "stored_file_folders update query", requestId)
        })))
      .then((folder) => this.toFolderDto(folder))
  }

  deleteFolder(payload: iSharedFiles.DeleteFileFolderPayloadDto, user: iContracts.iUserToken, requestId?: string): Promise<iSharedFiles.DeleteFileFolderResponseDto> {
    return this.findFolder(payload.folderUid)
      .then((folder) => this.assertCanManage(folder, user)
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
      .then((storedFile) => this.toUploadedFileDto(storedFile))
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

    return this.assertCanUseFolder(folderUid, user)
      .then(() => this.models.StoredDocument.create({
        title,
        contentJson: this.getEmptyDocumentJson(),
        contentHtml: "<p></p>",
        folderUid: folderUid as UUID | null,
        visibility,
        status: "draft",
        finalizedAt: null,
        createdByUserUid: user.uid
      }, {
        logging: this.createMutationQueryLogger("createDocument", "stored_documents insert query", requestId)
      }))
      .then((document) => this.toDocumentDto(document))
  }

  findDocumentAccessible(documentUid: string, user: iContracts.iUserToken): Promise<StoredDocument> {
    return this.findDocument(documentUid)
      .then((document) => this.canReadDocument(document, user)
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
      .then((document) => this.toDocumentDto(document))
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
        .then(() => this.createDocumentExportBuffer(document))
        .then((content) => {
          const path = join(this.documentsExportRoot, `${document.uid}.docx`)
          return writeFile(path, content)
            .then(() => ({
              path,
              originalName: `${this.getSafeExportFileName(document.title)}.docx`
            }))
        }))
  }

  createDownloadArchive(payload: iSharedFiles.CreateFilesArchivePayloadDto, user: iContracts.iUserToken): Promise<iSharedFiles.CreateFilesArchiveResponseDto> {
    const fileUids = this.normalizeArchiveFileUids(payload.fileUids)

    return this.cleanupExpiredArchives()
      .then(() => this.collectArchiveEntries(fileUids, user))
      .then((entries) => this.writeArchive(entries, user))
      .then((metadata) => ({
        archiveUid: metadata.archiveUid,
        url: this.getArchiveDownloadUrl(metadata.archiveUid)
      }))
  }

  findArchive(archiveUid: string, user: iContracts.iUserToken): Promise<ArchiveMetadata> {
    return this.readArchiveMetadata(archiveUid)
      .then((metadata) => {
        if (metadata.createdByUserUid !== user.uid && !this.isSuperadministrator(user)) {
          throw new Exceptions.ServiceError.AuthenticationError("Нет доступа к архиву")
        }

        return metadata
      })
  }

  confirmArchiveDownload(payload: iSharedFiles.ConfirmFilesArchiveDownloadPayloadDto, user: iContracts.iUserToken): Promise<iSharedFiles.ConfirmFilesArchiveDownloadResponseDto> {
    return this.findArchive(payload.archiveUid, user)
      .then((metadata) => Promise.all([
        rm(metadata.path, { force: true }),
        rm(this.getArchiveMetadataPath(metadata.archiveUid), { force: true })
      ]))
      .then(() => ({ success: true }))
  }

  find(fileUid: string): Promise<StoredFile> {
    return this.models.StoredFile.findByPk(fileUid)
      .then((storedFile) => {
        if (!storedFile) {
          throw new Error("Файл не найден")
        }

      return storedFile
    })
  }

  findAccessible(fileUid: string, user: iContracts.iUserToken): Promise<StoredFile> {
    return this.find(fileUid)
      .then((storedFile) => this.canReadFile(storedFile, user)
        .then((canRead) => {
          if (!canRead) {
            throw new Exceptions.ServiceError.AuthenticationError("Нет доступа к файлу")
          }

          return storedFile
        }))
  }

  findFileForManage(fileUid: string, user: iContracts.iUserToken): Promise<StoredFile> {
    return this.find(fileUid)
      .then((storedFile) => this.assertCanManage(storedFile, user)
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
      .then((document) => this.assertCanManage(document, user)
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

  toUploadedFileDto(file: StoredFile): iSharedFiles.UploadedFileDto {
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

  toDocumentDto(document: StoredDocument): iSharedFiles.StoredDocumentDto {
    return {
      documentUid: document.uid,
      title: document.title,
      contentJson: document.contentJson,
      contentHtml: document.contentHtml,
      folderUid: document.folderUid,
      visibility: document.visibility,
      status: document.status,
      createdByUserUid: document.createdByUserUid,
      createdAt: document.createdAt.toISOString(),
      updatedAt: document.updatedAt.toISOString(),
      finalizedAt: document.finalizedAt ? document.finalizedAt.toISOString() : null,
      exportUrl: this.getDocumentExportUrl(document.uid)
    }
  }

  private getDownloadUrl(fileUid: string): string {
    return `/v1/gateway/files/download?fileUid=${encodeURIComponent(fileUid)}`
  }

  private getArchiveDownloadUrl(archiveUid: string): string {
    return `/v1/gateway/files/archives/download?archiveUid=${encodeURIComponent(archiveUid)}`
  }

  private getDocumentExportUrl(documentUid: string): string {
    return `/v1/gateway/files/documents/export?documentUid=${encodeURIComponent(documentUid)}`
  }

  toFolderDto(folder: StoredFileFolder): iSharedFiles.FileFolderDto {
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

  private getViewUrl(file: StoredFile): string | null {
    if (!this.isViewable(file.mimeType)) return null

    return `/v1/gateway/files/view?fileUid=${encodeURIComponent(file.uid)}`
  }

  private getPreviewUrl(file: StoredFile): string | null {
    if (!this.previewProxy.supports(file.mimeType)) return null
    if (!existsSync(this.getPreviewProxyPath(file))) return null

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

  private normalizeArchiveFileUids(value: unknown): string[] {
    if (!Array.isArray(value)) {
      throw new Exceptions.ServiceError.ConflictError("Не выбраны файлы для скачивания")
    }

    const fileUids = Array.from(new Set(value
      .filter((fileUid): fileUid is string => typeof fileUid === "string")
      .map((fileUid) => fileUid.trim())
      .filter(Boolean)))

    if (!fileUids.length) {
      throw new Exceptions.ServiceError.ConflictError("Не выбраны файлы для скачивания")
    }

    return fileUids
  }

  private collectArchiveEntries(fileUids: string[], user: iContracts.iUserToken): Promise<ZipEntry[]> {
    const usedNames = new Map<string, number>()

    return fileUids.reduce<Promise<ZipEntry[]>>((previous, fileUid) => previous
      .then((entries) => this.findAccessible(fileUid, user)
        .then((file) => readFile(this.getContentPath(file))
          .then((content) => entries.concat({
            name: this.getUniqueArchiveEntryName(file.originalName, usedNames),
            content,
            date: file.updatedAt
          })))), Promise.resolve([]))
  }

  private writeArchive(entries: ZipEntry[], user: iContracts.iUserToken): Promise<ArchiveMetadata> {
    const archiveUid = randomUUID()
    const metadata: ArchiveMetadata = {
      archiveUid,
      createdByUserUid: user.uid,
      createdAt: new Date().toISOString(),
      originalName: `files-${archiveUid}.zip`,
      path: this.getArchivePath(archiveUid)
    }

    return mkdir(this.archivesRoot, { recursive: true })
      .then(() => writeFile(metadata.path, this.createZip(entries)))
      .then(() => writeFile(this.getArchiveMetadataPath(archiveUid), JSON.stringify(metadata)))
      .then(() => metadata)
  }

  private createZip(entries: ZipEntry[]): Buffer {
    const fileParts: Buffer[] = []
    const centralDirectoryParts: Buffer[] = []
    let offset = 0

    entries.forEach((entry) => {
      const localHeader = this.createZipLocalHeader(entry)
      const centralDirectoryEntry = this.createZipCentralDirectoryEntry(entry, offset)

      fileParts.push(localHeader, entry.content)
      centralDirectoryParts.push(centralDirectoryEntry)
      offset += localHeader.length + entry.content.length

      this.assertZipSize(offset)
    })

    const centralDirectorySize = centralDirectoryParts.reduce((sum, part) => sum + part.length, 0)
    const endOfCentralDirectory = this.createZipEndOfCentralDirectory(entries.length, centralDirectorySize, offset)

    return Buffer.concat(fileParts.concat(centralDirectoryParts, endOfCentralDirectory))
  }

  private createZipLocalHeader(entry: ZipEntry): Buffer {
    const name = Buffer.from(entry.name, "utf8")
    const header = Buffer.alloc(30 + name.length)
    const { dosTime, dosDate } = this.getZipDosDateTime(entry.date)
    const crc32 = this.getCrc32(entry.content)

    this.assertZipSize(entry.content.length)
    header.writeUInt32LE(0x04034b50, 0)
    header.writeUInt16LE(20, 4)
    header.writeUInt16LE(0x0800, 6)
    header.writeUInt16LE(0, 8)
    header.writeUInt16LE(dosTime, 10)
    header.writeUInt16LE(dosDate, 12)
    header.writeUInt32LE(crc32, 14)
    header.writeUInt32LE(entry.content.length, 18)
    header.writeUInt32LE(entry.content.length, 22)
    header.writeUInt16LE(name.length, 26)
    header.writeUInt16LE(0, 28)
    name.copy(header, 30)

    return header
  }

  private createZipCentralDirectoryEntry(entry: ZipEntry, offset: number): Buffer {
    const name = Buffer.from(entry.name, "utf8")
    const header = Buffer.alloc(46 + name.length)
    const { dosTime, dosDate } = this.getZipDosDateTime(entry.date)
    const crc32 = this.getCrc32(entry.content)

    this.assertZipSize(offset)
    header.writeUInt32LE(0x02014b50, 0)
    header.writeUInt16LE(20, 4)
    header.writeUInt16LE(20, 6)
    header.writeUInt16LE(0x0800, 8)
    header.writeUInt16LE(0, 10)
    header.writeUInt16LE(dosTime, 12)
    header.writeUInt16LE(dosDate, 14)
    header.writeUInt32LE(crc32, 16)
    header.writeUInt32LE(entry.content.length, 20)
    header.writeUInt32LE(entry.content.length, 24)
    header.writeUInt16LE(name.length, 28)
    header.writeUInt16LE(0, 30)
    header.writeUInt16LE(0, 32)
    header.writeUInt16LE(0, 34)
    header.writeUInt16LE(0, 36)
    header.writeUInt32LE(0, 38)
    header.writeUInt32LE(offset, 42)
    name.copy(header, 46)

    return header
  }

  private createZipEndOfCentralDirectory(entriesCount: number, centralDirectorySize: number, centralDirectoryOffset: number): Buffer {
    if (entriesCount > 0xffff) {
      throw new Exceptions.ServiceError.ConflictError("Слишком много файлов для одного архива")
    }

    this.assertZipSize(centralDirectorySize)
    this.assertZipSize(centralDirectoryOffset)

    const header = Buffer.alloc(22)
    header.writeUInt32LE(0x06054b50, 0)
    header.writeUInt16LE(0, 4)
    header.writeUInt16LE(0, 6)
    header.writeUInt16LE(entriesCount, 8)
    header.writeUInt16LE(entriesCount, 10)
    header.writeUInt32LE(centralDirectorySize, 12)
    header.writeUInt32LE(centralDirectoryOffset, 16)
    header.writeUInt16LE(0, 20)

    return header
  }

  private getCrc32(content: Buffer): number {
    let crc = 0xffffffff

    for (const byte of content) {
      crc = CRC32_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8)
    }

    return (crc ^ 0xffffffff) >>> 0
  }

  private getZipDosDateTime(date: Date): { dosTime: number, dosDate: number } {
    const year = Math.max(date.getFullYear(), 1980)

    return {
      dosTime: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
      dosDate: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate()
    }
  }

  private assertZipSize(value: number): void {
    if (value > MAX_ZIP_UINT32) {
      throw new Exceptions.ServiceError.ConflictError("Архив слишком большой")
    }
  }

  private getUniqueArchiveEntryName(originalName: string, usedNames: Map<string, number>): string {
    const safeName = this.getSafeArchiveEntryName(originalName)
    const usedCount = usedNames.get(safeName) || 0
    usedNames.set(safeName, usedCount + 1)

    if (!usedCount) return safeName

    const extensionIndex = safeName.lastIndexOf(".")
    if (extensionIndex <= 0) return `${safeName} (${usedCount + 1})`

    return `${safeName.slice(0, extensionIndex)} (${usedCount + 1})${safeName.slice(extensionIndex)}`
  }

  private getSafeArchiveEntryName(originalName: string): string {
    const safeName = originalName
      .replace(/[/\\:*?"<>|\x00-\x1F]/g, "_")
      .replace(/\.+$/g, "")
      .trim()

    return safeName || "file"
  }

  private getArchivePath(archiveUid: string): string {
    return join(this.archivesRoot, `${this.getSafeArchiveUid(archiveUid)}.zip`)
  }

  private getArchiveMetadataPath(archiveUid: string): string {
    return join(this.archivesRoot, `${this.getSafeArchiveUid(archiveUid)}.json`)
  }

  private getSafeArchiveUid(archiveUid: string): string {
    if (!/^[0-9a-f-]{36}$/i.test(archiveUid)) {
      throw new Exceptions.ServiceError.NotFoundError("Архив не найден")
    }

    return archiveUid
  }

  private readArchiveMetadata(archiveUid: string): Promise<ArchiveMetadata> {
    return readFile(this.getArchiveMetadataPath(archiveUid), "utf8")
      .then((content) => JSON.parse(content) as ArchiveMetadata)
      .then((metadata) => {
        if (metadata.archiveUid !== archiveUid) {
          throw new Exceptions.ServiceError.NotFoundError("Архив не найден")
        }

        metadata.path = this.getArchivePath(metadata.archiveUid)

        if (!existsSync(metadata.path)) {
          throw new Exceptions.ServiceError.NotFoundError("Архив не найден")
        }

        return metadata
      })
      .catch((error) => {
        if (error instanceof Exceptions.ServiceError.NotFoundError) throw error
        throw new Exceptions.ServiceError.NotFoundError("Архив не найден")
      })
  }

  private cleanupExpiredArchives(): Promise<void> {
    if (!existsSync(this.archivesRoot)) return Promise.resolve()

    return readdir(this.archivesRoot)
      .then((entries) => entries.reduce<Promise<void>>((previous, entry) => previous
        .then(() => {
          const path = join(this.archivesRoot, entry)

          return stat(path)
            .then((stats) => {
              if (Date.now() - stats.mtime.getTime() < TEMP_ARCHIVE_TTL_MS) return undefined
              return rm(path, { force: true })
            })
            .then(() => undefined)
            .catch(() => undefined)
        }), Promise.resolve()))
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
      .then((folder) => this.canReadFolder(folder, user)
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
      .then((folders) => folders.map((folder) => this.toFolderDto(folder)))
  }

  private listFilesByFolder(folderUid: string | null, ownerUserUid: string, user: iContracts.iUserToken): Promise<iSharedFiles.UploadedFileDto[]> {
    return this.models.StoredFile.findAll({
      where: { folderUid, createdByUserUid: ownerUserUid },
      order: [["createdAt", "DESC"]]
    })
      .then((files) => this.filterFilesByAccess(files, user))
      .then((files) => files.map((file) => this.toUploadedFileDto(file)))
  }

  private listDocumentsByFolder(folderUid: string | null, ownerUserUid: string, user: iContracts.iUserToken): Promise<iSharedFiles.StoredDocumentDto[]> {
    return this.models.StoredDocument.findAll({
      where: { folderUid, createdByUserUid: ownerUserUid },
      order: [["updatedAt", "DESC"]]
    })
      .then((documents) => this.filterDocumentsByAccess(documents, user))
      .then((documents) => documents.map((document) => this.toDocumentDto(document)))
  }

  private filterFoldersByAccess(folders: StoredFileFolder[], user: iContracts.iUserToken): Promise<StoredFileFolder[]> {
    return folders.reduce<Promise<StoredFileFolder[]>>((previous, folder) => previous
      .then((result) => this.canReadFolder(folder, user)
        .then((canRead) => canRead ? result.concat(folder) : result)), Promise.resolve([]))
  }

  private filterFilesByAccess(files: StoredFile[], user: iContracts.iUserToken): Promise<StoredFile[]> {
    return files.reduce<Promise<StoredFile[]>>((previous, file) => previous
      .then((result) => this.canReadFile(file, user)
        .then((canRead) => canRead ? result.concat(file) : result)), Promise.resolve([]))
  }

  private filterDocumentsByAccess(documents: StoredDocument[], user: iContracts.iUserToken): Promise<StoredDocument[]> {
    return documents.reduce<Promise<StoredDocument[]>>((previous, document) => previous
      .then((result) => this.canReadDocument(document, user)
        .then((canRead) => canRead ? result.concat(document) : result)), Promise.resolve([]))
  }

  private canReadFile(file: StoredFile, user: iContracts.iUserToken): Promise<boolean> {
    if (this.canManageEntity(file.createdByUserUid, user)) return Promise.resolve(true)
    if (file.visibility === "private") return Promise.resolve(false)
    if (!file.folderUid) return Promise.resolve(true)

    return this.areFolderAncestorsPublic(file.folderUid)
  }

  private canReadFolder(folder: StoredFileFolder, user: iContracts.iUserToken): Promise<boolean> {
    if (this.canManageEntity(folder.createdByUserUid, user)) return Promise.resolve(true)
    if (folder.visibility === "private") return Promise.resolve(false)

    return this.areFolderAncestorsPublic(folder.parentFolderUid)
  }

  private canReadDocument(document: StoredDocument, user: iContracts.iUserToken): Promise<boolean> {
    if (this.canManageEntity(document.createdByUserUid, user)) return Promise.resolve(true)
    if (document.visibility === "private") return Promise.resolve(false)
    if (!document.folderUid) return Promise.resolve(true)

    return this.areFolderAncestorsPublic(document.folderUid)
  }

  private areFolderAncestorsPublic(folderUid: UUID | string | null): Promise<boolean> {
    if (!folderUid) return Promise.resolve(true)

    return this.models.StoredFileFolder.findByPk(folderUid)
      .then((folder) => {
        if (!folder) return false
        if (folder.visibility === "private") return false

        return this.areFolderAncestorsPublic(folder.parentFolderUid)
      })
  }

  private assertCanUseFolder(folderUid: string | null, user: iContracts.iUserToken): Promise<void> {
    if (!folderUid) return Promise.resolve()

    return this.findFolder(folderUid)
      .then((folder) => this.assertCanManage(folder, user))
  }

  private assertCanManage(entity: { createdByUserUid: string }, user: iContracts.iUserToken): Promise<void> {
    if (this.canManageEntity(entity.createdByUserUid, user)) return Promise.resolve()

    throw new Exceptions.ServiceError.AuthenticationError("Нет доступа к изменению")
  }

  private canManageEntity(createdByUserUid: string, user: iContracts.iUserToken): boolean {
    return createdByUserUid === user.uid || this.isSuperadministrator(user)
  }

  private isSuperadministrator(user: iContracts.iUserToken): boolean {
    const roles = user.claims?.roles
    return Array.isArray(roles) && roles.includes("superadministrator")
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

      return this.assertCanUseFolder(folderUid, user).then(() => patch)
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

    return this.assertCanUseFolder(parentFolderUid, user)
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
      .then((breadcrumbs) => breadcrumbs.concat(this.toFolderDto(folder)))
  }

  private getParentBreadcrumbs(parentFolderUid: UUID | null): Promise<iSharedFiles.FileFolderDto[]> {
    if (!parentFolderUid) return Promise.resolve([])

    return this.findFolder(parentFolderUid)
      .then((folder) => this.getParentBreadcrumbs(folder.parentFolderUid)
        .then((breadcrumbs) => breadcrumbs.concat(this.toFolderDto(folder))))
  }

  private resolveOwner(userUid: string): Promise<iSharedFiles.FileOwnerDto> {
    return this.models.User.findByPk(userUid)
      .then((user) => {
        if (!user) throw new Exceptions.ServiceError.NotFoundError("Пользователь не найден")
        return this.toOwnerDto(user)
      })
  }

  private toOwnerDto(user: iDatabase.Models["User"]["prototype"]): iSharedFiles.FileOwnerDto {
    return {
      userUid: user.uid,
      fullName: user.fullName,
      login: user.login
    }
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
    return value === "private" ? "private" : "public"
  }

  private normalizeDocumentStatus(value: unknown): iSharedFiles.StoredDocumentStatus {
    return value === "final" ? "final" : "draft"
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

      return this.assertCanUseFolder(folderUid, user).then(() => patch)
    }

    return Promise.resolve(patch)
  }

  private normalizeDocumentContent(value: string, fieldName: string): string {
    if (value.length > 5 * 1024 * 1024) {
      throw new Exceptions.ServiceError.ConflictError(`${fieldName} слишком большой`)
    }

    return value
  }

  private createDocumentExportBuffer(document: StoredDocument): Promise<Buffer> {
    const rootNode = this.parseDocumentJson(document.contentJson)
    const file = new DocxDocument({
      title: document.title,
      sections: [
        {
          properties: {
            page: {
              size: {
                width: "210mm",
                height: "297mm"
              },
              margin: this.getDocxPageMargins(rootNode)
            }
          },
          footers: {
            default: this.createDocxFooter()
          },
          children: this.createDocxChildren(rootNode)
        }
      ],
      styles: {
        default: {
          document: {
            run: {
              font: "Calibri",
              size: 24
            },
            paragraph: {
              spacing: {
                after: 160
              }
            }
          }
        }
      }
    })

    return Packer.toBuffer(file)
  }

  private createDocxChildren(rootNode: TipTapNode): (Paragraph | Table)[] {
    const pageNodes = (rootNode.content || []).filter((node) => node.type === "page")
    const children = pageNodes.length
      ? this.createDocxPageChildren(pageNodes)
      : this.createDocxBlockChildren(rootNode.content || [])

    return children.length ? children : [new Paragraph("")]
  }

  private createDocxPageChildren(pageNodes: TipTapNode[]): (Paragraph | Table)[] {
    return pageNodes.flatMap((pageNode, pageIndex) => {
      const children = this.createDocxBlockChildren(pageNode.content || [])
      if (pageIndex === 0) return children

      return [
        new Paragraph({ children: [new PageBreak()] }),
        ...children
      ]
    })
  }

  private parseDocumentJson(contentJson: string): TipTapNode {
    try {
      const parsed = JSON.parse(contentJson) as TipTapNode
      if (parsed && typeof parsed === "object") return parsed
    } catch (error) {
      // Некорректный JSON редактора не должен ломать экспорт документа.
    }

    return {
      type: "doc",
      attrs: {
        pageMargins: defaultDocumentPageMargins
      },
      content: [
        {
          type: "page",
          content: [{ type: "paragraph" }]
        }
      ]
    }
  }

  private getDocxPageMargins(rootNode: TipTapNode): { top: `${number}mm`, right: `${number}mm`, bottom: `${number}mm`, left: `${number}mm` } {
    const pageMargins = this.getStoredPageMargins(rootNode)

    return {
      top: `${pageMargins.top}mm`,
      right: `${pageMargins.right}mm`,
      bottom: `${pageMargins.bottom}mm`,
      left: `${pageMargins.left}mm`
    }
  }

  private getStoredPageMargins(rootNode: TipTapNode): DocumentPageMargins {
    const value = rootNode.attrs?.pageMargins && typeof rootNode.attrs.pageMargins === "object"
      ? rootNode.attrs.pageMargins as Partial<DocumentPageMargins>
      : {}

    return this.normalizeDocumentPageMargins(value)
  }

  private normalizeDocumentPageMargins(value: Partial<DocumentPageMargins>): DocumentPageMargins {
    const margins = {
      top: this.normalizePageMarginValue(value.top, defaultDocumentPageMargins.top),
      right: this.normalizePageMarginValue(value.right, defaultDocumentPageMargins.right),
      bottom: this.normalizePageMarginValue(value.bottom, defaultDocumentPageMargins.bottom),
      left: this.normalizePageMarginValue(value.left, defaultDocumentPageMargins.left)
    }

    const left = Math.min(margins.left, documentPageWidthMillimeters - minimumDocumentContentSizeMillimeters)
    const right = Math.min(margins.right, documentPageWidthMillimeters - left - minimumDocumentContentSizeMillimeters)
    const top = Math.min(margins.top, documentPageHeightMillimeters - minimumDocumentContentSizeMillimeters)
    const bottom = Math.min(margins.bottom, documentPageHeightMillimeters - top - minimumDocumentContentSizeMillimeters)

    return {
      top,
      right,
      bottom,
      left
    }
  }

  private normalizePageMarginValue(value: unknown, fallback: number): number {
    const numericValue = Number(value)
    if (!Number.isFinite(numericValue)) return fallback

    return Math.max(0, numericValue)
  }

  private createDocxBlockChildren(nodes: TipTapNode[]): (Paragraph | Table)[] {
    return nodes.flatMap((node) => this.createDocxBlockChild(node))
  }

  private createDocxBlockChild(node: TipTapNode): (Paragraph | Table)[] {
    if (node.type === "heading") return [this.createDocxParagraph(node, this.getHeadingLevel(node))]
    if (node.type === "paragraph") return [this.createDocxParagraph(node)]
    if (node.type === "bulletList") return this.createDocxListChildren(node, false, 0)
    if (node.type === "orderedList") return this.createDocxListChildren(node, true, 0)
    if (node.type === "table") return [this.createDocxTable(node)]
    if (node.type === "pageBreak") return [new Paragraph({ children: [new PageBreak()] })]
    if (node.type === "horizontalRule") return [new Paragraph({ children: [new TextRun("────────────────────────")] })]
    if (node.type === "blockquote") {
      return (node.content || [])
        .filter((child) => child.type === "paragraph")
        .map((child) => new Paragraph({
          children: [new TextRun("  "), ...this.createDocxInlineChildren(child.content || [])],
          indent: { left: 360 }
        }))
    }

    if (node.content?.length) return this.createDocxBlockChildren(node.content)
    return []
  }

  private createDocxParagraph(node: TipTapNode, heading?: (typeof HeadingLevel)[keyof typeof HeadingLevel]): Paragraph {
    const children = this.createDocxInlineChildren(node.content || [])

    return new Paragraph({
      children: children.length ? children : [new TextRun("")],
      heading,
      alignment: this.getDocxAlignment(node),
      indent: this.getDocxIndent(node),
      spacing: this.getDocxParagraphSpacing(node)
    })
  }

  private createDocxFooter(): Footer {
    return new Footer({
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: "Страница " }),
            new TextRun({ children: [PageNumber.CURRENT] }),
            new TextRun({ text: " из " }),
            new TextRun({ children: [PageNumber.TOTAL_PAGES] })
          ]
        })
      ]
    })
  }

  private createDocxListChildren(node: TipTapNode, ordered: boolean, level: number): Paragraph[] {
    let itemNumber = 1

    return (node.content || []).flatMap((item) => {
      const itemPrefix = ordered ? `${itemNumber++}. ` : "• "
      const itemChildren = item.content || []

      return itemChildren.flatMap((child) => {
        if (child.type === "paragraph") {
          return [
            new Paragraph({
              children: [
                new TextRun({ text: itemPrefix }),
                ...this.createDocxInlineChildren(child.content || [])
              ],
              indent: {
                left: 360 * (level + 1)
              }
            })
          ]
        }

        if (child.type === "bulletList") return this.createDocxListChildren(child, false, level + 1)
        if (child.type === "orderedList") return this.createDocxListChildren(child, true, level + 1)
        return this.createDocxBlockChild(child).filter((block): block is Paragraph => block instanceof Paragraph)
      })
    })
  }

  private createDocxTable(node: TipTapNode): Table {
    const rows = (node.content || [])
      .filter((row) => row.type === "tableRow")
      .map((row) => new TableRow({
        children: (row.content || [])
          .filter((cell) => cell.type === "tableCell" || cell.type === "tableHeader")
          .map((cell) => new TableCell({
            children: this.createDocxTableCellChildren(cell),
            shading: cell.type === "tableHeader" ? { fill: "F1F5F9" } : undefined
          }))
      }))

    return new Table({
      rows: rows.length ? rows : [new TableRow({ children: [new TableCell({ children: [new Paragraph("")] })] })],
      layout: TableLayoutType.AUTOFIT,
      width: {
        size: 100,
        type: WidthType.PERCENTAGE
      }
    })
  }

  private createDocxTableCellChildren(node: TipTapNode): Paragraph[] {
    const children = this.createDocxBlockChildren(node.content || [])
      .filter((child): child is Paragraph => child instanceof Paragraph)

    return children.length ? children : [new Paragraph("")]
  }

  private createDocxInlineChildren(nodes: TipTapNode[]): ParagraphChild[] {
    return nodes.flatMap((node) => this.createDocxInlineChild(node))
  }

  private createDocxInlineChild(node: TipTapNode): ParagraphChild[] {
    if (node.type === "text") {
      const textRun = this.createDocxTextRun(node)
      const link = this.getMarkLink(node)

      if (!link) return [textRun]

      return [
        new ExternalHyperlink({
          link,
          children: [textRun]
        })
      ]
    }

    if (node.type === "hardBreak") return [new TextRun({ text: "", break: 1 })]
    if (node.type === "image") return [this.createDocxImageChild(node)]
    if (node.content?.length) return this.createDocxInlineChildren(node.content)

    return []
  }

  private createDocxTextRun(node: TipTapNode): TextRun {
    const marks = node.marks || []

    return new TextRun({
      text: node.text || "",
      bold: marks.some((mark) => mark.type === "bold"),
      italics: marks.some((mark) => mark.type === "italic"),
      strike: marks.some((mark) => mark.type === "strike"),
      underline: marks.some((mark) => mark.type === "underline") ? { type: UnderlineType.SINGLE } : undefined,
      style: this.getMarkLink(node) ? "Hyperlink" : undefined,
      color: this.getTextStyleAttribute(node, "color")?.replace(/^#/, ""),
      size: this.getDocxFontSize(node),
      font: this.getDocxFontFamily(node),
      shading: this.getTextStyleAttribute(node, "backgroundColor")
        ? { fill: this.getTextStyleAttribute(node, "backgroundColor")?.replace(/^#/, "") }
        : undefined
    })
  }

  private createDocxImageChild(node: TipTapNode): ParagraphChild {
    const src = typeof node.attrs?.src === "string" ? node.attrs.src : ""
    const title = typeof node.attrs?.alt === "string" && node.attrs.alt.trim() ? node.attrs.alt.trim() : "Изображение"
    const image = this.createDocxBase64Image(src, title)

    if (image) return image
    if (src) {
      return new ExternalHyperlink({
        link: src,
        children: [new TextRun({ text: title, style: "Hyperlink" })]
      })
    }

    return new TextRun(title)
  }

  private createDocxBase64Image(src: string, title: string): ImageRun | null {
    const match = src.match(/^data:image\/(png|jpe?g|gif|bmp);base64,(.+)$/i)
    if (!match) return null

    const type = match[1].toLowerCase() === "jpeg" ? "jpg" : match[1].toLowerCase()

    return new ImageRun({
      type: type as "jpg" | "png" | "gif" | "bmp",
      data: Buffer.from(match[2], "base64"),
      transformation: {
        width: 520,
        height: 320
      },
      altText: {
        name: title,
        title,
        description: title
      }
    })
  }

  private getHeadingLevel(node: TipTapNode): (typeof HeadingLevel)[keyof typeof HeadingLevel] {
    const level = node.attrs?.level
    if (level === 1) return HeadingLevel.HEADING_1
    if (level === 2) return HeadingLevel.HEADING_2
    if (level === 3) return HeadingLevel.HEADING_3
    if (level === 4) return HeadingLevel.HEADING_4
    if (level === 5) return HeadingLevel.HEADING_5
    return HeadingLevel.HEADING_6
  }

  private getDocxAlignment(node: TipTapNode): (typeof AlignmentType)[keyof typeof AlignmentType] | undefined {
    const textAlign = node.attrs?.textAlign
    if (textAlign === "center") return AlignmentType.CENTER
    if (textAlign === "right") return AlignmentType.RIGHT
    if (textAlign === "justify") return AlignmentType.JUSTIFIED
    return undefined
  }

  private getDocxIndent(node: TipTapNode): { left: number } | undefined {
    const indentLevel = Number(node.attrs?.indentLevel || 0)
    if (!indentLevel) return undefined

    return {
      left: Math.min(8, Math.max(0, indentLevel)) * 360
    }
  }

  private getDocxParagraphSpacing(node: TipTapNode): { after: number, line?: number, lineRule?: (typeof LineRuleType)[keyof typeof LineRuleType] } {
    const lineHeight = this.getTextStyleAttributeFromNodeOrChildren(node, "lineHeight")
    const numericLineHeight = lineHeight ? Number.parseFloat(lineHeight) : null

    return {
      after: 160,
      ...(numericLineHeight && Number.isFinite(numericLineHeight)
        ? {
            line: Math.round(numericLineHeight * 240),
            lineRule: LineRuleType.AUTO
          }
        : {})
    }
  }

  private getDocxFontSize(node: TipTapNode): number | undefined {
    const fontSize = this.getTextStyleAttribute(node, "fontSize")
    if (!fontSize) return undefined

    const numericSize = Number.parseFloat(fontSize)
    if (!Number.isFinite(numericSize)) return undefined

    return Math.round(numericSize * 1.5)
  }

  private getDocxFontFamily(node: TipTapNode): string | undefined {
    const fontFamily = this.getTextStyleAttribute(node, "fontFamily")
    if (!fontFamily) return undefined

    return fontFamily.split(",")[0].replace(/["']/g, "").trim() || undefined
  }

  private getTextStyleAttribute(node: TipTapNode, attributeName: string): string | undefined {
    const textStyleMark = node.marks?.find((mark) => mark.type === "textStyle")
    const value = textStyleMark?.attrs?.[attributeName]

    return typeof value === "string" && value.trim() ? value.trim() : undefined
  }

  private getTextStyleAttributeFromNodeOrChildren(node: TipTapNode, attributeName: string): string | undefined {
    const ownValue = this.getTextStyleAttribute(node, attributeName)
    if (ownValue) return ownValue

    return (node.content || [])
      .map((child) => this.getTextStyleAttributeFromNodeOrChildren(child, attributeName))
      .find((value): value is string => Boolean(value))
  }

  private getMarkLink(node: TipTapNode): string | null {
    const linkMark = node.marks?.find((mark) => mark.type === "link")
    const href = linkMark?.attrs?.href

    return typeof href === "string" && href.trim() ? href.trim() : null
  }

  private getEmptyDocumentJson(): string {
    return JSON.stringify({
      type: "doc",
      attrs: {
        pageMargins: defaultDocumentPageMargins
      },
      content: [
        {
          type: "page",
          content: [{ type: "paragraph" }]
        }
      ]
    })
  }

  private getSafeExportFileName(title: string): string {
    const safeTitle = title
      .replace(/[/\\:*?"<>|\x00-\x1F]/g, "_")
      .replace(/\.+$/g, "")
      .trim()

    return safeTitle || "document"
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
