export type ApiErrorCode =
  | "API_NETWORK_ERROR"
  | "API_INVALID_RESPONSE"
  | "API_REQUEST_FAILED"
  | "API_CONFIG_ERROR"
  | string

export class ApiError extends Error {
  constructor(
    readonly code: ApiErrorCode,
    message: string,
    readonly status: number
  ) {
    super(message)
    this.name = "ApiError"
  }
}
