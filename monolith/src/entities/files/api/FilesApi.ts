import type { ApiClient } from "@/application/api/ApiClient"
import type { DownloadProgressCallback, UploadProgressCallback } from "@/shared/api"

export class FilesApi {
  constructor(private readonly api: ApiClient) { }

  list(folderUid?: string | null, ownerUserUid?: string | null): Promise<iSharedFiles.ListFolderContentResponseDto> {
    return this.api.get<iSharedFiles.ListFolderContentResponseDto>({
      path: this.getListPath(folderUid, ownerUserUid),
      commit: "files/setContent"
    })
  }

  listOwners(): Promise<iSharedFiles.ListFileOwnersResponseDto> {
    return this.api.get<iSharedFiles.ListFileOwnersResponseDto>({
      path: "/files/owners/",
      commit: "files/setOwners"
    })
  }

  getMetadata(fileUid: string): Promise<iSharedFiles.GetFileMetadataResponseDto> {
    return this.api.get<iSharedFiles.GetFileMetadataResponseDto>({
      path: `/files/metadata?fileUid=${encodeURIComponent(fileUid)}`,
      reportError: false
    })
  }

  upload(files: File[], description: string, folderUid?: string | null, onProgress?: UploadProgressCallback): Promise<iSharedFiles.UploadResponseDto> {
    const formData = new FormData()

    formData.append("description", description)
    if (folderUid) formData.append("folderUid", folderUid)

    files.forEach((file) => {
      formData.append("files", file)
    })

    return this.api.upload<iSharedFiles.UploadResponseDto>("/files/upload", formData, true, onProgress)
      .then((result) => {
        result.files.forEach((file) => this.api.commit("files/addFile", file))
        return result
      })
  }

  update(payload: iSharedFiles.UpdateFilePayloadDto): Promise<iSharedFiles.UpdateFileResponseDto> {
    return this.api.patch<iSharedFiles.UpdateFileResponseDto, iSharedFiles.UpdateFilePayloadDto>({
      path: "/files/",
      payload,
      commit: "files/updateFile"
    })
  }

  delete(payload: iSharedFiles.DeleteFilePayloadDto): Promise<iSharedFiles.DeleteFileResponseDto> {
    return this.api.delete<iSharedFiles.DeleteFileResponseDto, iSharedFiles.DeleteFilePayloadDto>({
      path: "/files/",
      payload,
      commit: "files/deleteFile"
    })
  }

  createDocument(payload: iSharedFiles.CreateDocumentPayloadDto): Promise<iSharedFiles.CreateDocumentResponseDto> {
    return this.api.post<iSharedFiles.CreateDocumentResponseDto, iSharedFiles.CreateDocumentPayloadDto>({
      path: "/files/documents",
      payload,
      commit: "files/addDocument"
    })
  }

  getDocument(documentUid: string): Promise<iSharedFiles.GetDocumentResponseDto> {
    return this.api.get<iSharedFiles.GetDocumentResponseDto>({
      path: `/files/documents/metadata?documentUid=${encodeURIComponent(documentUid)}`,
      reportError: false
    })
  }

  updateDocument(payload: iSharedFiles.UpdateDocumentPayloadDto): Promise<iSharedFiles.UpdateDocumentResponseDto> {
    return this.api.patch<iSharedFiles.UpdateDocumentResponseDto, iSharedFiles.UpdateDocumentPayloadDto>({
      path: "/files/documents",
      payload,
      commit: "files/updateDocument"
    })
  }

  deleteDocument(payload: iSharedFiles.DeleteDocumentPayloadDto): Promise<iSharedFiles.DeleteDocumentResponseDto> {
    return this.api.delete<iSharedFiles.DeleteDocumentResponseDto, iSharedFiles.DeleteDocumentPayloadDto>({
      path: "/files/documents",
      payload,
      commit: "files/deleteDocument"
    })
  }

  createArchive(payload: iSharedFiles.CreateFilesArchivePayloadDto): Promise<iSharedFiles.CreateFilesArchiveResponseDto> {
    return this.api.post<iSharedFiles.CreateFilesArchiveResponseDto, iSharedFiles.CreateFilesArchivePayloadDto>({
      path: "/files/archives",
      payload
    })
  }

  downloadArchive(url: string, onProgress?: DownloadProgressCallback): Promise<Blob> {
    return this.api.download(this.getApiPathFromPublicUrl(url), true, onProgress)
  }

  confirmArchiveDownload(payload: iSharedFiles.ConfirmFilesArchiveDownloadPayloadDto): Promise<iSharedFiles.ConfirmFilesArchiveDownloadResponseDto> {
    return this.api.post<iSharedFiles.ConfirmFilesArchiveDownloadResponseDto, iSharedFiles.ConfirmFilesArchiveDownloadPayloadDto>({
      path: "/files/archives/success",
      payload,
      reportError: false
    })
  }

  createFolder(payload: iSharedFiles.CreateFileFolderPayloadDto): Promise<iSharedFiles.CreateFileFolderResponseDto> {
    return this.api.post<iSharedFiles.CreateFileFolderResponseDto, iSharedFiles.CreateFileFolderPayloadDto>({
      path: "/files/folders",
      payload,
      commit: "files/addFolder"
    })
  }

  updateFolder(payload: iSharedFiles.UpdateFileFolderPayloadDto): Promise<iSharedFiles.UpdateFileFolderResponseDto> {
    return this.api.patch<iSharedFiles.UpdateFileFolderResponseDto, iSharedFiles.UpdateFileFolderPayloadDto>({
      path: "/files/folders",
      payload,
      commit: "files/updateFolder"
    })
  }

  deleteFolder(payload: iSharedFiles.DeleteFileFolderPayloadDto): Promise<iSharedFiles.DeleteFileFolderResponseDto> {
    return this.api.delete<iSharedFiles.DeleteFileFolderResponseDto, iSharedFiles.DeleteFileFolderPayloadDto>({
      path: "/files/folders",
      payload,
      commit: "files/deleteFolder"
    })
  }

  private getListPath(folderUid?: string | null, ownerUserUid?: string | null): `/${string}` {
    const searchParams = new URLSearchParams()
    if (folderUid) searchParams.set("folderUid", folderUid)
    if (ownerUserUid) searchParams.set("ownerUserUid", ownerUserUid)
    const queryString = searchParams.toString()

    return queryString ? `/files/?${queryString}` : "/files/"
  }

  private getApiPathFromPublicUrl(url: string): `/${string}` {
    const gatewayPrefix = "/v1/gateway"

    if (url.startsWith(gatewayPrefix)) {
      return url.slice(gatewayPrefix.length) as `/${string}`
    }

    return url as `/${string}`
  }
}
