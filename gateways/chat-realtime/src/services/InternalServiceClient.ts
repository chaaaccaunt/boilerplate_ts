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
      .then((response) => response.json()
        .then((envelope: iSharedApi.ResponseEnvelope<TResult>) => {
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

}


