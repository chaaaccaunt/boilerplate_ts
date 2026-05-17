declare global {
  namespace iSharedFiles {
    interface UploadedFileDto {
      fileUid: string
      originalName: string
      mimeType: string
      size: number
      description: string | null
      url: string
      viewUrl: string | null
      previewUrl: string | null
    }

    interface UploadResponseDto {
      files: UploadedFileDto[]
    }

    interface UpdateFilePayloadDto {
      fileUid: string
      description?: string
    }

    type UpdateFileResponseDto = UploadedFileDto

    interface DeleteFilePayloadDto {
      fileUid: string
    }

    interface DeleteFileResponseDto {
      fileUid: string
    }
  }
}

export { }
