import { Exceptions } from "@/libs"

interface RequestOptions<TPayload> {
  requestId: string
  method?: "GET" | "POST" | "PATCH" | "DELETE"
  path: string
  payload?: TPayload
}

export class InternalServiceClient {
  constructor(private readonly baseUrl: string) { }

  request<TResult, TPayload = iContracts.iPayload>(options: RequestOptions<TPayload>): Promise<TResult> {
    const url = this.createUrl(options.path, options.method || "POST", options.payload)

    return fetch(url, {
      method: options.method || "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "x-request-id": options.requestId
      },
      body: options.method === "GET" ? undefined : JSON.stringify(options.payload || {})
    })
      .then((response) => response.json()
        .then((envelope: iSharedApi.ResponseEnvelope<TResult>) => {
          if (envelope.ok) return envelope.result
          throw this.toServiceError(response.status, envelope.error.message)
        }))
  }

  private createUrl<TPayload>(path: string, method: string, payload: TPayload | undefined): string {
    const url = new URL(path, this.baseUrl)

    if (method === "GET" && this.isPayload(payload)) {
      const queryPayload = payload as iContracts.iPayload
      Object.entries(queryPayload).forEach(([key, value]) => {
        if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
          url.searchParams.set(key, String(value))
        }
      })
    }

    return url.toString()
  }

  private toServiceError(status: number, message: string): Error {
    if (status === 401) return new Exceptions.ServiceError.AuthenticationError(message)
    if (status === 404) return new Exceptions.ServiceError.NotFoundError(message)
    if (status === 409) return new Exceptions.ServiceError.ConflictError(message)
    return new Exceptions.ServiceError.InternalError(message)
  }

  private isPayload(value: unknown): value is iContracts.iPayload {
    return typeof value === "object" && value !== null && !Array.isArray(value)
  }
}


