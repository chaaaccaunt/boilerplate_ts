import { Store } from "vuex"
import { ApiError, HttpClient, UploadProgressCallback } from "@/shared/api"
import { AuthorizationApi } from "../authorization/api/AuthorizationApi"
import { FilesApi } from "../files/api/FilesApi"

type ApiPath = `/${string}`
type VuexMutation = string

interface ApiRequestOptions<TPayload> {
  path: ApiPath
  payload?: TPayload
  commit?: VuexMutation
  reportError?: boolean
}

export class ApiClient {
  readonly authorization: AuthorizationApi
  readonly files: FilesApi

  constructor(
    private readonly http: HttpClient,
    private readonly store: Store<iSharedState.RootState>
  ) {
    this.authorization = new AuthorizationApi(this)
    this.files = new FilesApi(this)
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

  delete<TResult>(options: Omit<ApiRequestOptions<never>, "payload">): Promise<TResult> {
    return this.request<TResult, never>("DELETE", options)
  }

  upload<TResult>(path: ApiPath, formData: FormData, reportError = true, onProgress?: UploadProgressCallback): Promise<TResult> {
    return this.uploadRequest<TResult>(path, formData, reportError, onProgress)
  }

  resolvePublicUrl(path: ApiPath): string {
    return this.http.resolvePublicUrl(path)
  }

  private async uploadRequest<TResult>(path: ApiPath, formData: FormData, reportError: boolean, onProgress?: UploadProgressCallback): Promise<TResult> {
    try {
      return await this.http.upload<TResult>(path, formData, onProgress)
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
      const result = await this.http.request<TResult, TPayload>({
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
}

