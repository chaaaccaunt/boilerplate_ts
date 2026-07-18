import { randomUUID } from "crypto"
import { Exceptions } from "@/libs"

export class FileEventsGatewayClient {
  private readonly requestTimeoutMs = 10_000

  constructor(private readonly baseUrl: string) {
    if (!this.baseUrl) {
      throw new Error("FileEventsGatewayClient требует URL chat realtime gateway")
    }
  }

  notify(payload: iSharedFiles.FilesRealtimeEventDto): Promise<void> {
    const url = new URL("/files/events", this.baseUrl)
    const abortController = new AbortController()
    const timeout = setTimeout(() => abortController.abort(), this.requestTimeoutMs)

    return fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "x-request-id": randomUUID()
      },
      body: JSON.stringify(payload),
      signal: abortController.signal
    })
      .catch((error) => {
        throw new Exceptions.ServiceError.InternalError("Chat realtime gateway недоступен", { cause: error })
      })
      .then((response) => response.json()
        .catch((error) => {
          throw new Exceptions.ServiceError.InternalError("Chat realtime gateway вернул некорректный JSON", { cause: error })
        }))
      .then((envelope: unknown) => {
        if (!this.isEnvelope(envelope)) {
          throw new Exceptions.ServiceError.InternalError("Chat realtime gateway вернул некорректный формат ответа")
        }

        if (!envelope.ok) {
          throw new Exceptions.ServiceError.InternalError(envelope.error.message)
        }
      })
      .finally(() => clearTimeout(timeout))
  }

  private isEnvelope(value: unknown): value is iSharedApi.ResponseEnvelope<unknown> {
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
