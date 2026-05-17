import type { ApiClient } from "@/application/api/ApiClient"
import type { UploadProgressCallback } from "@/shared/api"

export class FilesApi {
  constructor(private readonly api: ApiClient) { }

  list(): Promise<{ files: iSharedFiles.UploadedFileDto[] }> {
    return this.api.get<{ files: iSharedFiles.UploadedFileDto[] }>({
      path: "/files",
      commit: "files/setFiles"
    })
  }

  upload(files: File[], description: string, onProgress?: UploadProgressCallback): Promise<iSharedFiles.UploadResponseDto> {
    const formData = new FormData()

    formData.append("description", description)

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
      path: "/files",
      payload,
      commit: "files/updateFile"
    })
  }

  delete(payload: iSharedFiles.DeleteFilePayloadDto): Promise<iSharedFiles.DeleteFileResponseDto> {
    return this.api.delete<iSharedFiles.DeleteFileResponseDto, iSharedFiles.DeleteFilePayloadDto>({
      path: "/files",
      payload,
      commit: "files/deleteFile"
    })
  }
}
