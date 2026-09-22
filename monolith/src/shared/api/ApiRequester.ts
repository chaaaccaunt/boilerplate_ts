import type { DownloadProgressCallback, UploadProgressCallback } from "./HttpClient"

export type ApiPath = `/${string}`

export interface ApiRequestOptions<TPayload> {
  path: ApiPath
  payload?: TPayload
  commit?: string
  reportError?: boolean
}

export interface ApiRequester {
  commit(type: string, payload?: unknown): void
  get<TResult>(options: Omit<ApiRequestOptions<never>, "payload">): Promise<TResult>
  post<TResult, TPayload = never>(options: ApiRequestOptions<TPayload>): Promise<TResult>
  patch<TResult, TPayload = never>(options: ApiRequestOptions<TPayload>): Promise<TResult>
  delete<TResult, TPayload = never>(options: ApiRequestOptions<TPayload>): Promise<TResult>
  upload<TResult>(path: ApiPath, formData: FormData, reportError?: boolean, onProgress?: UploadProgressCallback): Promise<TResult>
  download(path: ApiPath, reportError?: boolean, onProgress?: DownloadProgressCallback): Promise<Blob>
  resolvePublicUrl(path: ApiPath): string
}
