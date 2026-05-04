import { Server as SocketServer, Socket } from "socket.io"
import { Logger, MethodTracer, TraceContext } from "../Logger"
import { WebSocketMiddlewares } from "./middlewares"
import {
  iWebSocketConfig,
  iWebSocketEvent,
  iWebSocketEventContext,
  iWebSocketGateway,
  iWebSocketNativeServer
} from "./types"

export class WebSocketServer {
  private readonly socketServer: SocketServer
  private readonly middlewares: WebSocketMiddlewares
  private readonly tracer: MethodTracer
  private readonly gateways: iWebSocketGateway[] = []

  constructor(
    nativeServer: iWebSocketNativeServer,
    private readonly config: iWebSocketConfig,
    private readonly logger = new Logger()
  ) {
    this.socketServer = new SocketServer(nativeServer, {
      transports: ["websocket"],
      cors: {
        origin: config.origin,
        credentials: true
      }
    })
    this.middlewares = new WebSocketMiddlewares(config)
    this.tracer = new MethodTracer(logger)
  }

  use(gateways: readonly iWebSocketGateway[]): void {
    this.gateways.push(...gateways)
  }

  listen(): void {
    this.socketServer.use((socket, next) => this.middlewares.validateConnectionToken(socket, next))
    this.socketServer.on("connection", (socket) => this.handleConnection(socket))
  }

  private handleConnection(socket: Socket): void {
    const user = socket.data.user as iContracts.iUserToken | undefined

    if (!user) {
      socket.disconnect(true)
      return
    }

    this.logger.info("WebSocket подключение установлено", {
      userId: user.uid
    })

    for (const gateway of this.gateways) {
      this.registerGateway(socket, user, gateway)
    }

    socket.on("disconnect", (reason) => {
      this.logger.info("WebSocket подключение закрыто", {
        userId: user.uid,
        reason
      })
    })
  }

  private registerGateway(socket: Socket, user: iContracts.iUserToken, gateway: iWebSocketGateway): void {
    for (const event of gateway.getEvents()) {
      socket.on(event.name, async (payload, callback) => {
        await this.handleEvent(socket, user, gateway, event, payload, callback)
      })
    }
  }

  private async handleEvent(
    socket: Socket,
    user: iContracts.iUserToken,
    gateway: iWebSocketGateway,
    event: iWebSocketEvent,
    payload: unknown,
    callback?: (response: unknown) => void
  ): Promise<void> {
    const traceContext = new TraceContext()
    const eventContext: iWebSocketEventContext = {
      socket,
      user,
      eventName: event.name
    }

    this.logger.debug("WebSocket событие получено", {
      userId: user.uid,
      event: event.name,
      payload: this.getLogPayload(payload)
    })

    if (event.validator) {
      const validationError = this.middlewares.validatePayload(payload, event.validator)
      if (validationError) {
        this.logger.warn("WebSocket payload не прошел валидацию", {
          userId: user.uid,
          event: event.name,
          reason: validationError.message
        })
        this.emitError(callback, "PAYLOAD_VALIDATION_FAILED", validationError.message)
        return
      }
    }

    try {
      const result = await this.tracer.trace(
        traceContext,
        "gateway",
        event.name,
        "info",
        async () => event.handler(eventContext, payload as iContracts.iPayload),
        {
          event: "WebSocket gateway завершил работу",
          gatewayName: gateway.name,
          gatewayEvent: event.name
        }
      )

      this.emitSuccess(callback, result)
    } catch (error) {
      this.logger.error("Ошибка WebSocket gateway", {
        userId: user.uid,
        event: event.name,
        error: error instanceof Error ? error : String(error),
        trace: traceContext.getTrace()
      })
      this.emitError(callback, "WEBSOCKET_EVENT_FAILED", "Не удалось обработать WebSocket событие")
    }
  }

  private emitSuccess(callback: ((response: unknown) => void) | undefined, result: unknown): void {
    callback?.({
      ok: true,
      result,
      error: null
    })
  }

  private emitError(callback: ((response: unknown) => void) | undefined, code: string, message: string): void {
    callback?.({
      ok: false,
      result: null,
      error: {
        code,
        message
      }
    })
  }

  private getLogPayload(payload: unknown): iContracts.iPayload | string | number | boolean | null {
    if (this.isPayload(payload)) return payload
    if (typeof payload === "string" || typeof payload === "number" || typeof payload === "boolean" || payload === null) return payload

    return "Неподдерживаемый payload"
  }

  private isPayload(value: unknown): value is iContracts.iPayload {
    return typeof value === "object" && value !== null && !Array.isArray(value)
  }
}

export type {
  iWebSocketConfig,
  iWebSocketEvent,
  iWebSocketEventContext,
  iWebSocketEventHandler,
  iWebSocketEventResult,
  iWebSocketGateway,
  iWebSocketNativeServer
} from "./types"
