import { randomUUID } from "crypto"
import { existsSync } from "fs"
import { mkdir, readFile, readdir, rm, stat, writeFile } from "fs/promises"
import { tmpdir } from "os"
import { join } from "path"
import { Exceptions } from "@/libs"
import { FileAccessPolicy } from "./FileAccessPolicy"
import { FileDtoMapper } from "./FileDtoMapper"
import { ZipArchiveWriter, ZipSourceEntry } from "./ZipArchiveWriter"

export interface ArchiveMetadata {
  archiveUid: string
  createdByUserUid: string
  createdAt: string
  originalName: string
  path: string
}

export class FileArchiveService {
  private readonly archivesRoot = join(tmpdir(), "boilerplate-files-archives")
  private readonly uploadsRoot = join(process.cwd(), "uploads")
  private readonly maxArchiveFiles = 100
  private readonly maxArchiveContentBytes = 200 * 1024 * 1024
  private readonly archiveTtlMs = 1000 * 60 * 60 * 6

  constructor(
    private readonly storedFileModel: iDatabase.Models["StoredFile"],
    private readonly accessPolicy: FileAccessPolicy,
    private readonly dtoMapper: FileDtoMapper,
    private readonly zipWriter: ZipArchiveWriter
  ) { }

  create(payload: iSharedFiles.CreateFilesArchivePayloadDto, user: iContracts.iUserToken): Promise<iSharedFiles.CreateFilesArchiveResponseDto> {
    const fileUids = this.normalizeFileUids(payload.fileUids)
    return this.cleanupExpired()
      .then(() => this.collectEntries(fileUids, user))
      .then((entries) => this.write(entries, user))
      .then((metadata) => ({ archiveUid: metadata.archiveUid, url: this.dtoMapper.getArchiveDownloadUrl(metadata.archiveUid) }))
  }

  find(archiveUid: string, user: iContracts.iUserToken): Promise<ArchiveMetadata> {
    return this.readMetadata(archiveUid).then((metadata) => {
      if (metadata.createdByUserUid !== user.uid && !this.accessPolicy.isSuperadministrator(user)) {
        throw new Exceptions.ServiceError.AuthenticationError("Нет доступа к архиву")
      }
      return metadata
    })
  }

  confirmDownload(payload: iSharedFiles.ConfirmFilesArchiveDownloadPayloadDto, user: iContracts.iUserToken): Promise<iSharedFiles.ConfirmFilesArchiveDownloadResponseDto> {
    return this.find(payload.archiveUid, user)
      .then((metadata) => Promise.all([rm(metadata.path, { force: true }), rm(this.getMetadataPath(metadata.archiveUid), { force: true })]))
      .then(() => ({ success: true }))
  }

  private normalizeFileUids(value: unknown): string[] {
    if (!Array.isArray(value)) throw new Exceptions.ServiceError.ConflictError("Не выбраны файлы для скачивания")
    const fileUids = Array.from(new Set(value.filter((uid): uid is string => typeof uid === "string").map((uid) => uid.trim()).filter(Boolean)))
    if (!fileUids.length) throw new Exceptions.ServiceError.ConflictError("Не выбраны файлы для скачивания")
    if (fileUids.length > this.maxArchiveFiles) throw new Exceptions.ServiceError.ConflictError("В один архив можно добавить не более 100 файлов")
    return fileUids
  }

  private collectEntries(fileUids: string[], user: iContracts.iUserToken): Promise<ZipSourceEntry[]> {
    const usedNames = new Map<string, number>()
    let totalSize = 0
    return fileUids.reduce<Promise<ZipSourceEntry[]>>((previous, fileUid) => previous
      .then((entries) => this.findAccessibleFile(fileUid, user).then((file) => {
        totalSize += file.size
        if (totalSize > this.maxArchiveContentBytes) throw new Exceptions.ServiceError.ConflictError("Суммарный размер файлов в архиве не должен превышать 200 МБ")
        return entries.concat({ name: this.getUniqueEntryName(file.originalName, usedNames), contentPath: this.getContentPath(file.storagePath), size: file.size, date: file.updatedAt })
      })), Promise.resolve([]))
  }

  private findAccessibleFile(fileUid: string, user: iContracts.iUserToken) {
    return this.storedFileModel.findByPk(fileUid).then((file) => {
      if (!file) throw new Exceptions.ServiceError.NotFoundError("Файл не найден")
      return this.accessPolicy.canReadFile(file, user).then((canRead) => {
        if (!canRead) throw new Exceptions.ServiceError.AuthenticationError("Нет доступа к файлу")
        return file
      })
    })
  }

  private write(entries: ZipSourceEntry[], user: iContracts.iUserToken): Promise<ArchiveMetadata> {
    const archiveUid = randomUUID()
    const metadata: ArchiveMetadata = { archiveUid, createdByUserUid: user.uid, createdAt: new Date().toISOString(), originalName: `files-${archiveUid}.zip`, path: this.getArchivePath(archiveUid) }
    return mkdir(this.archivesRoot, { recursive: true })
      .then(() => this.zipWriter.write(metadata.path, entries))
      .then(() => writeFile(this.getMetadataPath(archiveUid), JSON.stringify(metadata)))
      .then(() => metadata)
  }

  private readMetadata(archiveUid: string): Promise<ArchiveMetadata> {
    return readFile(this.getMetadataPath(archiveUid), "utf8")
      .then((content) => JSON.parse(content) as ArchiveMetadata)
      .then((metadata) => {
        if (metadata.archiveUid !== archiveUid) throw new Exceptions.ServiceError.NotFoundError("Архив не найден")
        metadata.path = this.getArchivePath(metadata.archiveUid)
        if (!existsSync(metadata.path)) throw new Exceptions.ServiceError.NotFoundError("Архив не найден")
        return metadata
      })
      .catch((error) => {
        if (error instanceof Exceptions.ServiceError.NotFoundError) throw error
        throw new Exceptions.ServiceError.NotFoundError("Архив не найден")
      })
  }

  private cleanupExpired(): Promise<void> {
    if (!existsSync(this.archivesRoot)) return Promise.resolve()
    return readdir(this.archivesRoot).then((entries) => entries.reduce<Promise<void>>((previous, entry) => previous.then(() => {
      const path = join(this.archivesRoot, entry)
      return stat(path).then((stats) => Date.now() - stats.mtime.getTime() < this.archiveTtlMs ? undefined : rm(path, { force: true })).then(() => undefined).catch(() => undefined)
    }), Promise.resolve()))
  }

  private getUniqueEntryName(originalName: string, usedNames: Map<string, number>): string {
    const safeName = originalName.replace(/[/\\:*?"<>|\x00-\x1F]/g, "_").replace(/\.+$/g, "").trim() || "file"
    const count = usedNames.get(safeName) || 0
    usedNames.set(safeName, count + 1)
    if (!count) return safeName
    const extensionIndex = safeName.lastIndexOf(".")
    return extensionIndex <= 0 ? `${safeName} (${count + 1})` : `${safeName.slice(0, extensionIndex)} (${count + 1})${safeName.slice(extensionIndex)}`
  }

  private getContentPath(storagePath: string): string {
    if (!/^\d{4}\/\d{2}\/\d{2}\/[0-9a-f-]{36}$/i.test(storagePath)) throw new Error("Некорректный путь хранения файла")
    return join(this.uploadsRoot, storagePath, "content")
  }

  private getSafeArchiveUid(uid: string): string {
    if (!/^[0-9a-f-]{36}$/i.test(uid)) throw new Exceptions.ServiceError.NotFoundError("Архив не найден")
    return uid
  }

  private getArchivePath(uid: string): string {
    return join(this.archivesRoot, `${this.getSafeArchiveUid(uid)}.zip`)
  }

  private getMetadataPath(uid: string): string {
    return join(this.archivesRoot, `${this.getSafeArchiveUid(uid)}.json`)
  }
}
