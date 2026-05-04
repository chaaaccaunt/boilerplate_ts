declare global {
  namespace iSharedFiles {
    interface UploadedFileDto {
      fileUid: string
      originalName: string
      mimeType: string
      size: number
      description: string | null
      url: string
    }

    interface UploadResponseDto {
      files: UploadedFileDto[]
    }
  }
}

export { }
