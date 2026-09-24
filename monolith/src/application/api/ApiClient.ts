import { Store } from "vuex"
import { ApiError, DownloadProgressCallback, HttpClient, UploadProgressCallback } from "@/shared/api"
import type { ApiPath, ApiRequester, ApiRequestOptions } from "@/shared/api"
import { AuthorizationApi } from "@/entities/authorization/api/AuthorizationApi"
import { ChatApi } from "@/entities/chat/api/ChatApi"
import { FilesApi } from "@/entities/files/api/FilesApi"
import { LogsApi } from "@/entities/logs/api/LogsApi"
import { SystemApi } from "@/entities/system/api/SystemApi"
import { UsersApi } from "@/entities/users/api/UsersApi"
import { NotificationsApi } from "@/entities/notifications/api"

export interface ApiTransport {
  matches(path: ApiPath): boolean
  client: HttpClient
}

export class ApiClient implements ApiRequester {
  readonly authorization: AuthorizationApi
  readonly chat: ChatApi
  readonly files: FilesApi
  readonly logs: LogsApi
  readonly system: SystemApi
  readonly users: UsersApi
  readonly notifications: NotificationsApi

  constructor(
    private readonly defaultHttpClient: HttpClient,
    private readonly transports: ReadonlyArray<ApiTransport>,
    private readonly store: Store<iSharedState.RootState>
  ) {
    this.authorization = new AuthorizationApi(this)
    this.chat = new ChatApi(this)
    this.files = new FilesApi(this)
    this.logs = new LogsApi(this)
    this.system = new SystemApi(this)
    this.users = new UsersApi(this)
    this.notifications = new NotificationsApi(this)
  }

  commit(type: string, payload?: unknown): void {
    this.store.commit(type, payload)
  }

  get<TResult>(options: Omit<ApiRequestOptions<never>, "payload">): Promise<TResult> {
    return this.request<TResult, never>("GET", options)
  }

  post<TResult, TPayload = never>(options: ApiRequestOptions<TPayload>): Promise<TResult> {
    return this.request<TResult, TPayload>("POST", options)
  }

  patch<TResult, TPayload = never>(options: ApiRequestOptions<TPayload>): Promise<TResult> {
    return this.request<TResult, TPayload>("PATCH", options)
  }

  delete<TResult, TPayload = never>(options: ApiRequestOptions<TPayload>): Promise<TResult> {
    return this.request<TResult, TPayload>("DELETE", options)
  }

  upload<TResult>(path: ApiPath, formData: FormData, reportError = true, onProgress?: UploadProgressCallback): Promise<TResult> {
    return this.uploadRequest<TResult>(path, formData, reportError, onProgress)
  }

  download(path: ApiPath, reportError = true, onProgress?: DownloadProgressCallback): Promise<Blob> {
    return this.downloadRequest(path, reportError, onProgress)
  }

  resolvePublicUrl(path: ApiPath): string {
    return this.getHttpClient(path).resolvePublicUrl(path)
  }

  private async downloadRequest(path: ApiPath, reportError: boolean, onProgress?: DownloadProgressCallback): Promise<Blob> {
    try {
      return await this.getHttpClient(path).download(path, onProgress)
    } catch (error) {
      const apiError = this.normalizeError(error)

      if (reportError) {
        await this.store.dispatch("errors/add", {
          code: apiError.code,
          message: apiError.message,
          status: apiError.status
        })
      }

      throw apiError
    }
  }

  private async uploadRequest<TResult>(path: ApiPath, formData: FormData, reportError: boolean, onProgress?: UploadProgressCallback): Promise<TResult> {
    try {
      return await this.getHttpClient(path).upload<TResult>(path, formData, onProgress)
    } catch (error) {
      const apiError = this.normalizeError(error)

      if (reportError) {
        await this.store.dispatch("errors/add", {
          code: apiError.code,
          message: apiError.message,
          status: apiError.status
        })
      }

      throw apiError
    }
  }

  private async request<TResult, TPayload>(
    method: "GET" | "POST" | "PATCH" | "DELETE",
    options: ApiRequestOptions<TPayload>
  ): Promise<TResult> {
    try {
      const result = await this.getHttpClient(options.path).request<TResult, TPayload>({
        method,
        path: options.path,
        payload: options.payload
      })

      if (options.commit) {
        this.store.commit(options.commit, result)
      }

      return result
    } catch (error) {
      const apiError = this.normalizeError(error)

      if (options.reportError !== false) {
        await this.store.dispatch("errors/add", {
          code: apiError.code,
          message: apiError.message,
          status: apiError.status
        })
      }

      throw apiError
    }
  }

  private normalizeError(error: unknown): ApiError {
    if (error instanceof ApiError) return error
    if (error instanceof Error) return new ApiError("API_UNKNOWN_ERROR", error.message, 0)
    return new ApiError("API_UNKNOWN_ERROR", "Неизвестная ошибка API", 0)
  }

  private getHttpClient(path: ApiPath): HttpClient {
    return this.transports.find((transport) => transport.matches(path))?.client || this.defaultHttpClient
  }
}
