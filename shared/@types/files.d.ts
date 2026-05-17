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
  }
}

export { }
