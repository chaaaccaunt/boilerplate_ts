import { ApiError } from "./ApiError"

export interface HttpClientConfig {
  baseUrl: string
}

type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE"

interface RequestOptions<TPayload> {
  method: HttpMethod
  path: `/${string}`
  payload?: TPayload
}

type RequestInitOptions = Pick<RequestInit, "body" | "headers" | "method" | "credentials">
export type UploadProgressCallback = (progress: number) => void
export type DownloadProgressCallback = (progress: number | null) => void

interface ApiErrorPayload {
  code: string
  message: string
}

interface ApiEnvelopeLike {
  ok: unknown
  result: unknown
  error: unknown
}

interface ApiErrorLike {
  code: unknown
  message: unknown
}

const JSON_CONTENT_TYPE = "application/json"

export class HttpClient {
  private readonly baseUrl: string
  private readonly baseOrigin: string

  constructor(config: HttpClientConfig) {
    this.baseUrl = this.normalizeBaseUrl(config.baseUrl)
    this.baseOrigin = new URL(this.baseUrl).origin
  }

  async request<TResult, TPayload = never>(options: RequestOptions<TPayload>): Promise<TResult> {
    const response = await this.fetchResponse(options)
    const envelope = await this.parseEnvelope<TResult>(response)

    if (!envelope.ok) {
      throw new ApiError(envelope.error.code, envelope.error.message, response.status)
    }

    return envelope.result
  }

  async download(path: `/${string}`, onProgress?: DownloadProgressCallback): Promise<Blob> {
    const response = await this.fetchResponse({ method: "GET", path })

    if (!response.ok) {
      const envelope = await this.parseEnvelope<never>(response)
      if (envelope.ok) throw new ApiError("API_DOWNLOAD_FAILED", "Не удалось скачать файл", response.status)
      throw new ApiError(envelope.error.code, envelope.error.message, response.status)
    }

    return this.readBlobResponse(response, onProgress)
  }

  upload<TResult>(path: `/${string}`, formData: FormData, onProgress?: UploadProgressCallback): Promise<TResult> {
    return this.fetchUploadResponse(path, formData, onProgress)
      .then((response) => this.parseEnvelope<TResult>(response)
        .then((envelope) => {
          if (!envelope.ok) {
            throw new ApiError(envelope.error.code, envelope.error.message, response.status)
          }

          return envelope.result
        }))
  }

  resolvePublicUrl(path: `/${string}`): string {
    return new URL(path, this.baseOrigin).toString()
  }

  private async fetchResponse<TPayload>(options: RequestOptions<TPayload>): Promise<Response> {
    try {
      return await fetch(this.getUrl(options.path), this.getRequestInit(options))
    } catch (error) {
      throw new ApiError("API_NETWORK_ERROR", this.getNetworkErrorMessage(error), 0)
    }
  }

  private async readBlobResponse(response: Response, onProgress?: DownloadProgressCallback): Promise<Blob> {
    const contentLength = Number(response.headers.get("Content-Length") || 0)

    if (!response.body || !Number.isFinite(contentLength) || contentLength <= 0) {
      onProgress?.(null)
      const blob = await response.blob()
      onProgress?.(100)
      return blob
    }

    const reader = response.body.getReader()
    const chunks: BlobPart[] = []
    let receivedLength = 0

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      if (!value) continue

      chunks.push(new Uint8Array(value).buffer)
      receivedLength += value.length
      onProgress?.(Math.min(100, Math.round((receivedLength / contentLength) * 100)))
    }

    onProgress?.(100)
    return new Blob(chunks, {
      type: response.headers.get("Content-Type") || undefined
    })
  }

  private fetchUploadResponse(path: `/${string}`, formData: FormData, onProgress?: UploadProgressCallback): Promise<Response> {
    return new Promise((resolve, reject) => {
      const request = new XMLHttpRequest()

      request.open("POST", this.getUrl(path))
      request.withCredentials = true
      request.responseType = "text"

      request.upload.onprogress = (event) => {
        if (event.lengthComputable && onProgress) {
          onProgress(Math.round((event.loaded / event.total) * 100))
        }
      }

      request.onload = () => {
        const headers = new Headers()
        request.getAllResponseHeaders()
          .trim()
          .split(/[\r\n]+/)
          .filter(Boolean)
          .forEach((line) => {
            const separatorIndex = line.indexOf(":")
            if (separatorIndex === -1) return
            headers.append(line.slice(0, separatorIndex).trim(), line.slice(separatorIndex + 1).trim())
          })

        resolve(new Response(request.responseText, {
          status: request.status,
          statusText: request.statusText,
          headers
        }))
      }

      request.onerror = () => reject(new ApiError("API_NETWORK_ERROR", "Не удалось выполнить сетевой запрос", 0))
      request.onabort = () => reject(new ApiError("API_NETWORK_ERROR", "Загрузка файла отменена", 0))
      request.send(formData)
    })
  }

  private getRequestInit<TPayload>(options: RequestOptions<TPayload>): RequestInitOptions {
    this.assertValidRequestOptions(options)

    return {
      method: options.method,
      credentials: "include",
      headers: this.getHeaders(options.payload),
      body: this.getBody(options.payload)
    }
  }

  private assertValidRequestOptions<TPayload>(options: RequestOptions<TPayload>): void {
    if (options.method === "GET" && options.payload !== undefined) {
      throw new ApiError("API_REQUEST_FAILED", "GET-запрос не может содержать payload", 0)
    }
  }

  private getUrl(path: RequestOptions<never>["path"]): string {
    return `${this.baseUrl}${path}`
  }

  private normalizeBaseUrl(baseUrl: string): string {
    if (!baseUrl) {
      throw new ApiError("API_CONFIG_ERROR", "Не задан базовый URL API", 0)
    }

    return baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl
  }

  private getHeaders(payload: unknown): HeadersInit | undefined {
    if (payload === undefined) return undefined

    return {
      "Content-Type": JSON_CONTENT_TYPE
    }
  }

  private getBody(payload: unknown): BodyInit | undefined {
    if (payload === undefined) return undefined
    return JSON.stringify(payload)
  }

  private async parseEnvelope<TResult>(response: Response): Promise<iSharedApi.ResponseEnvelope<TResult>> {
    this.assertJsonResponse(response)

    const payload = await this.parseJson(response)

    if (!this.isEnvelope<TResult>(payload)) {
      throw new ApiError("API_INVALID_RESPONSE", "Некорректный формат ответа API", response.status)
    }

    return payload
  }

  private assertJsonResponse(response: Response): void {
    const contentType = response.headers.get("Content-Type") || ""

    if (response.status === 413) {
      throw new ApiError("API_PAYLOAD_TOO_LARGE", "Файл слишком большой для загрузки", response.status)
    }

    if (!contentType.includes(JSON_CONTENT_TYPE)) {
      throw new ApiError("API_INVALID_RESPONSE", "Ответ API не является JSON", response.status)
    }
  }

  private async parseJson(response: Response): Promise<unknown> {
    try {
      return await response.json()
    } catch (error) {
      throw new ApiError("API_INVALID_RESPONSE", this.getJsonErrorMessage(error), response.status)
    }
  }

  private isEnvelope<TResult>(payload: unknown): payload is iSharedApi.ResponseEnvelope<TResult> {
    if (!this.isRecord(payload)) return false

    const envelope: ApiEnvelopeLike = {
      ok: payload.ok,
      result: payload.result,
      error: payload.error
    }

    if (typeof envelope.ok !== "boolean") return false

    if (envelope.ok) {
      return envelope.error === null
    }

    return envelope.result === null && this.isApiErrorPayload(envelope.error)
  }

  private isApiErrorPayload(value: unknown): value is ApiErrorPayload {
    if (!this.isRecord(value)) return false

    const error: ApiErrorLike = {
      code: value.code,
      message: value.message
    }

    return typeof error.code === "string" && typeof error.message === "string"
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value)
  }

  private getNetworkErrorMessage(error: unknown): string {
    return "Не удалось выполнить сетевой запрос"
  }

  private getJsonErrorMessage(error: unknown): string {
    return "Некорректный JSON в ответе API"
  }
}
