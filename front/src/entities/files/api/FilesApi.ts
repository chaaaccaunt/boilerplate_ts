import type { ApiClient } from "@/entities/api/ApiClient"
import type { UploadProgressCallback } from "@/shared/api"

export class FilesApi {
  constructor(private readonly api: ApiClient) { }

  upload(files: File[], description: string, onProgress?: UploadProgressCallback): Promise<iSharedFiles.UploadResponseDto> {
    const formData = new FormData()

    formData.append("description", description)

    files.forEach((file) => {
      formData.append("files", file)
    })

    return this.api.upload<iSharedFiles.UploadResponseDto>("/files/upload", formData, true, onProgress)
  }
}
