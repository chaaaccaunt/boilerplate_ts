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

  constructor(config: HttpClientConfig) {
    this.baseUrl = this.normalizeBaseUrl(config.baseUrl)
  }

  async request<TResult, TPayload = never>(options: RequestOptions<TPayload>): Promise<TResult> {
    const response = await this.fetchResponse(options)
    const envelope = await this.parseEnvelope<TResult>(response)

    if (!envelope.ok) {
      throw new ApiError(envelope.error.code, envelope.error.message, response.status)
    }

    return envelope.result
  }

  private async fetchResponse<TPayload>(options: RequestOptions<TPayload>): Promise<Response> {
    try {
      return await fetch(this.getUrl(options.path), this.getRequestInit(options))
    } catch (error) {
      throw new ApiError("API_NETWORK_ERROR", this.getNetworkErrorMessage(error), 0)
    }
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
    if (!baseUrl) return ""
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
    if (error instanceof Error) return error.message
    return "Не удалось выполнить сетевой запрос"
  }

  private getJsonErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message
    return "Некорректный JSON в ответе API"
  }
}
