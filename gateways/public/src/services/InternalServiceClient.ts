import { Exceptions } from "@/libs"

interface RequestOptions<TPayload> {
  requestId: string
  path: string
  payload?: TPayload
}

export class InternalServiceClient {
  constructor(private readonly baseUrl: string) { }

  request<TResult, TPayload = iContracts.iPayload>(options: RequestOptions<TPayload>): Promise<TResult> {
    const url = new URL(options.path, this.baseUrl)

    return fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "x-request-id": options.requestId
      },
      body: JSON.stringify(options.payload || {})
    })
      .catch((error) => {
        throw new Exceptions.ServiceError.InternalError("Внутренний сервис недоступен", { cause: error })
      })
      .then((response) => response.json()
        .catch((error) => {
          throw new Exceptions.ServiceError.InternalError("Внутренний сервис вернул некорректный JSON", { cause: error })
        })
        .then((envelope: unknown) => {
          if (!this.isEnvelope<TResult>(envelope)) {
            throw new Exceptions.ServiceError.InternalError("Внутренний сервис вернул некорректный формат ответа")
          }

          if (envelope.ok) return envelope.result
          throw this.toServiceError(response.status, envelope.error.message)
        }))
  }

  private toServiceError(status: number, message: string): Error {
    if (status === 401) return new Exceptions.ServiceError.AuthenticationError(message)
    if (status === 404) return new Exceptions.ServiceError.NotFoundError(message)
    if (status === 409) return new Exceptions.ServiceError.ConflictError(message)
    return new Exceptions.ServiceError.InternalError(message)
  }

  private isEnvelope<TResult>(value: unknown): value is iSharedApi.ResponseEnvelope<TResult> {
    if (typeof value !== "object" || value === null || Array.isArray(value)) return false
    if (!("ok" in value) || typeof value.ok !== "boolean") return false

    if (value.ok) return "result" in value && "error" in value && value.error === null

    return (
      "result" in value &&
      value.result === null &&
      "error" in value &&
      typeof value.error === "object" &&
      value.error !== null &&
      !Array.isArray(value.error) &&
      "message" in value.error &&
      typeof value.error.message === "string"
    )
  }

}


