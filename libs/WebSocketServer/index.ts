import { Server as SocketServer, Socket } from "socket.io"
import { Logger, MethodTracer, TraceContext } from "../Logger"
import { WebSocketMiddlewares } from "./middlewares"
import {
  iWebSocketBroadcastOptions,
  iWebSocketConfig,
  iWebSocketEvent,
  iWebSocketEventContext,
  iWebSocketController,
  iWebSocketNativeServer
} from "./types"

export class WebSocketServer {
  private readonly socketServer: SocketServer
  private readonly middlewares: WebSocketMiddlewares
  private readonly tracer: MethodTracer
  private readonly controllers: iWebSocketController[] = []

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
      },
      allowRequest: (request, callback) => {
        callback(null, request.headers.origin === config.origin)
      },
      path: "/v1/connection"
    })
    this.middlewares = new WebSocketMiddlewares(config)
    this.tracer = new MethodTracer(logger)
  }

  use(controllers: readonly iWebSocketController[]): void {
    this.controllers.push(...controllers)
  }

  listen(): void {
    this.socketServer.use((socket, next) => this.middlewares.validateConnectionToken(socket, next))
    this.socketServer.on("connection", (socket) => this.handleConnection(socket))
  }

  broadcast<TResult>(eventName: string, result: TResult, options: iWebSocketBroadcastOptions = {}): void {
    for (const [, socket] of this.socketServer.sockets.sockets) {
      if (this.shouldSkipBroadcastSocket(socket, options)) continue

      socket.emit(eventName, this.createSuccessEnvelope(result))
    }
  }

  private handleConnection(socket: Socket): void {
    const user = socket.data.user as iContracts.iUserToken | undefined

    if (!user) {
      socket.disconnect(true)
      return
    }

    this.logger.debug("WebSocket подключение установлено", {
      userId: user.uid,
      sessionUid: user.sessionUid,
      socketId: socket.id,
      userAgent: socket.handshake.headers["user-agent"] || null
    })

    socket.on("disconnect", (reason) => {
      this.logger.debug("WebSocket подключение закрыто", {
        userId: user.uid,
        sessionUid: user.sessionUid,
        socketId: socket.id,
        reason
      })
    })

    for (const controller of this.controllers) {
      this.registerController(socket, user, controller)
    }
  }

  private registerController(socket: Socket, user: iContracts.iUserToken, controller: iWebSocketController): void {
    for (const event of controller.getEvents()) {
      socket.on(event.name, (payload, callback) => {
        this.handleEvent(socket, user, controller, event, payload, callback)
      })
    }
  }

  private handleEvent(
    socket: Socket,
    user: iContracts.iUserToken,
    controller: iWebSocketController,
    event: iWebSocketEvent,
    payload: unknown,
    callback?: (response: unknown) => void
  ): void {
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

    this.tracer.trace(
      traceContext,
      "controller",
      event.name,
      "info",
      () => Promise.resolve().then(() => event.handler(eventContext, payload as iContracts.iPayload)),
      {
        event: "WebSocket controller завершил работу",
        gatewayName: controller.name,
        gatewayEvent: event.name
      }
    )
      .then((result) => {
        this.emitSuccess(callback, result)
      })
      .catch((error) => {
        this.logger.error("Ошибка WebSocket controller", {
          userId: user.uid,
          event: event.name,
          error: error instanceof Error ? error : String(error),
          trace: traceContext.getTrace()
        })
        this.emitError(callback, "WEBSOCKET_EVENT_FAILED", "Не удалось обработать WebSocket событие")
      })
  }

  private emitSuccess(callback: ((response: unknown) => void) | undefined, result: unknown): void {
    callback?.(this.createSuccessEnvelope(result))
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

  private shouldSkipBroadcastSocket(socket: Socket, options: iWebSocketBroadcastOptions): boolean {
    if (options.excludeSocketId && socket.id === options.excludeSocketId) return true

    const user = socket.data.user as iContracts.iUserToken | undefined
    if (options.excludeUserUid && user?.uid === options.excludeUserUid) return true
    if (options.allowedUserUids?.length && (!user || !options.allowedUserUids.includes(user.uid))) return true
    if (!this.hasAllowedAccess(user, options.allowedPermissions, options.allowedRoles)) return true

    return false
  }

  private hasAllowedAccess(
    user: iContracts.iUserToken | undefined,
    allowedPermissions: readonly iSharedPermission.PermissionKey[] | undefined,
    allowedRoles: readonly iSharedUserRole.UserRoleName[] | undefined
  ): boolean {
    if (!allowedPermissions?.length && !allowedRoles?.length) return true
    if (this.hasAllowedPermission(user, allowedPermissions)) return true
    return this.hasAllowedRole(user, allowedRoles)
  }

  private hasAllowedPermission(user: iContracts.iUserToken | undefined, allowedPermissions: readonly iSharedPermission.PermissionKey[] | undefined): boolean {
    if (!allowedPermissions?.length) return false
    if (!user) return false

    const permissions = user.claims?.permissions
    if (!Array.isArray(permissions)) return false

    return allowedPermissions.some((permissionKey) => permissions.includes(permissionKey))
  }

  private hasAllowedRole(user: iContracts.iUserToken | undefined, allowedRoles: readonly iSharedUserRole.UserRoleName[] | undefined): boolean {
    if (!allowedRoles?.length) return false
    if (!user) return false

    const roles = user.claims?.roles
    if (!Array.isArray(roles)) return false

    return allowedRoles.some((roleName) => roles.includes(roleName))
  }

  private createSuccessEnvelope<TResult>(result: TResult): iSharedApi.ResponseEnvelope<TResult> {
    return {
      ok: true,
      result,
      error: null
    }
  }
}

export type {
  iWebSocketConfig,
  iWebSocketBroadcastOptions,
  iWebSocketEvent,
  iWebSocketEventContext,
  iWebSocketEventHandler,
  iWebSocketEventResult,
  iWebSocketController,
  iWebSocketNativeServer
} from "./types"
