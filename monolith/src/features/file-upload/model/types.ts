export type FileUploadStatus = "uploading" | "uploaded" | "failed"

export interface FileUploadItem {
  uid: string
  fileName: string
  fileSize: number
  progress: number
  status: FileUploadStatus
  uploadedFile: iSharedFiles.UploadedFileDto | null
  errorMessage: string
}
