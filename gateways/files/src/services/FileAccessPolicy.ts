import type { UUID } from "crypto"
import { Exceptions } from "@/libs"

type FolderModel = iDatabase.Models["StoredFileFolder"]
type FileEntity = {
  createdByUserUid: string
  visibility: iSharedFiles.FileVisibility
  folderUid: UUID | null
}
type FolderEntity = {
  createdByUserUid: string
  visibility: iSharedFiles.FileVisibility
  parentFolderUid: UUID | null
}

export class FileAccessPolicy {
  constructor(private readonly folderModel: FolderModel) { }

  canReadListedItem(entity: { createdByUserUid: string, visibility: iSharedFiles.FileVisibility }, user: iContracts.iUserToken): boolean {
    return this.canManage(entity.createdByUserUid, user) || entity.visibility === "public"
  }

  canReadFile(file: FileEntity, user: iContracts.iUserToken): Promise<boolean> {
    if (this.canManage(file.createdByUserUid, user)) return Promise.resolve(true)
    if (file.visibility === "private") return Promise.resolve(false)
    return this.areFolderAncestorsPublic(file.folderUid)
  }

  canReadFolder(folder: FolderEntity, user: iContracts.iUserToken): Promise<boolean> {
    if (this.canManage(folder.createdByUserUid, user)) return Promise.resolve(true)
    if (folder.visibility === "private") return Promise.resolve(false)
    return this.areFolderAncestorsPublic(folder.parentFolderUid)
  }

  assertCanUseFolder(folderUid: string | null, user: iContracts.iUserToken): Promise<void> {
    if (!folderUid) return Promise.resolve()

    return this.folderModel.findByPk(folderUid)
      .then((folder) => {
        if (!folder) throw new Exceptions.ServiceError.NotFoundError("Папка не найдена")
        return this.assertCanManage(folder, user)
      })
  }

  assertCanManage(entity: { createdByUserUid: string }, user: iContracts.iUserToken): Promise<void> {
    if (this.canManage(entity.createdByUserUid, user)) return Promise.resolve()
    throw new Exceptions.ServiceError.AuthenticationError("Нет доступа к изменению")
  }

  isSuperadministrator(user: iContracts.iUserToken): boolean {
    const roles = user.claims?.roles
    return Array.isArray(roles) && roles.includes("superadministrator")
  }

  private canManage(createdByUserUid: string, user: iContracts.iUserToken): boolean {
    return createdByUserUid === user.uid || this.isSuperadministrator(user)
  }

  private areFolderAncestorsPublic(folderUid: UUID | string | null): Promise<boolean> {
    if (!folderUid) return Promise.resolve(true)

    return this.folderModel.findByPk(folderUid)
      .then((folder) => {
        if (!folder || folder.visibility === "private") return false
        return this.areFolderAncestorsPublic(folder.parentFolderUid)
      })
  }
}
