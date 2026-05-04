import { io, Socket } from "socket.io-client"
import { ApiError } from "@/shared/api"

type WebSocketEvent =
  | "chat:rooms:list"
  | "chat:room:create"
  | "chat:room:join"
  | "chat:messages:list"
  | "chat:message:send"

type WebSocketServerEvent = "chat:message:created"

export class WebSocketClient {
  private readonly socket: Socket

  constructor(baseUrl: string) {
    this.socket = io(this.normalizeBaseUrl(baseUrl), {
      withCredentials: true,
      autoConnect: false,
      transports: ["websocket"]
    })
  }

  connect(): void {
    if (!this.socket.connected) {
      this.socket.connect()
    }
  }

  disconnect(): void {
    this.socket.disconnect()
  }

  on<TResult>(eventName: WebSocketServerEvent, handler: (result: TResult) => void): void {
    this.socket.on(eventName, (payload: unknown) => {
      const envelope = this.parseEnvelope<TResult>(payload)
      if (envelope.ok) handler(envelope.result)
    })
  }

  off(eventName: WebSocketServerEvent): void {
    this.socket.off(eventName)
  }

  emit<TResult, TPayload = never>(eventName: WebSocketEvent, payload?: TPayload): Promise<TResult> {
    this.connect()

    return new Promise((resolve, reject) => {
      this.socket.emit(eventName, payload, (response: unknown) => {
        try {
          const envelope = this.parseEnvelope<TResult>(response)
          if (envelope.ok) {
            resolve(envelope.result)
            return
          }

          reject(new ApiError(envelope.error.code, envelope.error.message, 0))
        } catch (error) {
          reject(error)
        }
      })
    })
  }

  private parseEnvelope<TResult>(payload: unknown): iSharedApi.ResponseEnvelope<TResult> {
    if (!this.isEnvelope<TResult>(payload)) {
      throw new ApiError("API_INVALID_RESPONSE", "Некорректный формат WebSocket ответа", 0)
    }

    return payload
  }

  private isEnvelope<TResult>(payload: unknown): payload is iSharedApi.ResponseEnvelope<TResult> {
    if (!this.isRecord(payload)) return false
    if (typeof payload.ok !== "boolean") return false
    if (payload.ok) return payload.error === null

    return payload.result === null && this.isRecord(payload.error) && typeof payload.error.code === "string" && typeof payload.error.message === "string"
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value)
  }

  private normalizeBaseUrl(baseUrl: string): string {
    if (!baseUrl) {
      throw new ApiError("API_CONFIG_ERROR", "Не задан базовый URL WebSocket", 0)
    }

    return baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl
  }
}
