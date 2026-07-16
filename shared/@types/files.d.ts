declare global {
  namespace iSharedFiles {
    type FileVisibility = "public" | "private"

    interface FileFolderDto {
      uid: string
      title: string
      parentFolderUid: string | null
      visibility: FileVisibility
      createdByUserUid: string
      createdAt: string
      updatedAt: string
    }

    interface UploadedFileDto {
      fileUid: string
      originalName: string
      mimeType: string
      size: number
      description: string | null
      folderUid: string | null
      visibility: FileVisibility
      createdByUserUid: string
      createdAt: string
      updatedAt: string
      url: string
      viewUrl: string | null
      previewUrl: string | null
    }

    type StoredDocumentStatus = "draft" | "final"

    interface StoredDocumentDto {
      documentUid: string
      title: string
      contentJson: string
      contentHtml: string
      folderUid: string | null
      visibility: FileVisibility
      status: StoredDocumentStatus
      createdByUserUid: string
      createdAt: string
      updatedAt: string
      finalizedAt: string | null
      exportUrl: string
    }

    interface FileOwnerDto {
      userUid: string
      fullName: string
      login: string
    }

    interface UploadResponseDto {
      files: UploadedFileDto[]
    }

    interface ListFolderContentPayloadDto {
      folderUid?: string | null
      ownerUserUid?: string | null
    }

    interface ListFolderContentResponseDto {
      owner: FileOwnerDto | null
      folder: FileFolderDto | null
      folders: FileFolderDto[]
      files: UploadedFileDto[]
      documents: StoredDocumentDto[]
      breadcrumbs: FileFolderDto[]
    }

    interface ListFileOwnersResponseDto {
      owners: FileOwnerDto[]
    }

    interface GetFileMetadataPayloadDto {
      fileUid: string
    }

    type GetFileMetadataResponseDto = UploadedFileDto

    interface CreateFileFolderPayloadDto {
      title: string
      parentFolderUid?: string | null
      visibility?: FileVisibility
    }

    type CreateFileFolderResponseDto = FileFolderDto

    interface UpdateFileFolderPayloadDto {
      folderUid: string
      title?: string
      parentFolderUid?: string | null
      visibility?: FileVisibility
    }

    type UpdateFileFolderResponseDto = FileFolderDto

    interface DeleteFileFolderPayloadDto {
      folderUid: string
    }

    interface DeleteFileFolderResponseDto {
      folderUid: string
    }

    interface UpdateFilePayloadDto {
      fileUid: string
      description?: string
      folderUid?: string | null
      visibility?: FileVisibility
    }

    type UpdateFileResponseDto = UploadedFileDto

    interface DeleteFilePayloadDto {
      fileUid: string
    }

    interface DeleteFileResponseDto {
      fileUid: string
    }

    interface CreateDocumentPayloadDto {
      title: string
      folderUid?: string | null
      visibility?: FileVisibility
    }

    type CreateDocumentResponseDto = StoredDocumentDto

    interface GetDocumentPayloadDto {
      documentUid: string
    }

    type GetDocumentResponseDto = StoredDocumentDto

    interface UpdateDocumentPayloadDto {
      documentUid: string
      title?: string
      contentJson?: string
      contentHtml?: string
      folderUid?: string | null
      visibility?: FileVisibility
      status?: StoredDocumentStatus
    }

    type UpdateDocumentResponseDto = StoredDocumentDto

    interface DeleteDocumentPayloadDto {
      documentUid: string
    }

    interface DeleteDocumentResponseDto {
      documentUid: string
    }

    interface CreateFilesArchivePayloadDto {
      fileUids: string[]
    }

    interface CreateFilesArchiveResponseDto {
      archiveUid: string
      url: string
    }

    interface ConfirmFilesArchiveDownloadPayloadDto {
      archiveUid: string
    }

    interface ConfirmFilesArchiveDownloadResponseDto {
      success: boolean
    }

    type FilesRealtimeEventName =
      | "files:file:created"
      | "files:file:updated"
      | "files:file:deleted"
      | "files:folder:created"
      | "files:folder:updated"
      | "files:folder:deleted"
      | "files:document:created"
      | "files:document:updated"
      | "files:document:deleted"

    interface FilesRealtimeEventPayloadDto {
      changedAt: string
    }

    interface FilesRealtimeEventDto extends FilesRealtimeEventPayloadDto {
      eventName: FilesRealtimeEventName
    }
  }
}

export { }
