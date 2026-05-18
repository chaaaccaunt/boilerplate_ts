import { randomUUID } from "crypto"
import { createServer, Server, Socket } from "net"
import { Logger } from "@/libs"
import { LogCollectorService } from "./LogCollectorService"

interface CollectorConnectionState {
  source: string | null
  socket: Socket
}

interface MetricsResponseMessage {
  collectorMessageType: "metrics_response"
  requestId: string
  source: string
  metrics: iSharedSystem.RuntimeMetricsDto
}

interface PendingMetricsRequest {
  resolve: (item: iSharedSystem.RuntimeMetricsItemDto) => void
  timeout: NodeJS.Timeout
}

export class LogCollectorSocketServer {
  private readonly server: Server
  private readonly shouldPrintCollectedLogs = process.env.NODE_ENV !== "production"
  private readonly connectionStates = new Set<CollectorConnectionState>()
  private readonly pendingMetricsRequests = new Map<string, PendingMetricsRequest>()
  private readonly metricsTimeoutMs = 1500

  constructor(
    private readonly port: string,
    private readonly service: LogCollectorService,
    private readonly logger = new Logger()
  ) {
    this.server = createServer((socket) => this.handleConnection(socket))
  }

  listen(): void {
    this.server.listen(this.normalizePort(this.port), () => {
      this.logger.info("Log collector socket server запущен", {
        serviceName: this.constructor.name,
        serviceMethod: "listen",
        status: this.normalizePort(this.port)
      })
    })
  }

  private handleConnection(socket: Socket): void {
    socket.setEncoding("utf8")
    let buffer = ""
    const state: CollectorConnectionState = {
      source: null,
      socket
    }
    this.connectionStates.add(state)

    socket.on("data", (chunk) => {
      buffer += chunk
      const lines = buffer.split("\n")
      buffer = lines.pop() || ""

      lines
        .map((line) => line.trim())
        .filter(Boolean)
        .forEach((line) => this.handleLine(line, state))
    })

    socket.on("close", (hadError) => {
      this.connectionStates.delete(state)
      this.handleDisconnect(state, hadError, socket)
    })
  }

  private handleLine(line: string, state: CollectorConnectionState): void {
    Promise.resolve()
      .then(() => JSON.parse(line))
      .then((payload) => {
        if (this.handleMetricsResponse(payload)) return null
        return this.normalizePayload(payload)
      })
      .then((payload) => {
        if (!payload) return null
        state.source = payload.source
        this.printCollectedLog(payload)
        return this.service.collect(payload)
      })
      .catch((error) => {
        this.logger.warn("Не удалось сохранить log record", {
          serviceName: this.constructor.name,
          serviceMethod: "handleLine",
          error
        })
      })
  }

  collectRuntimeMetrics(): Promise<iSharedSystem.RuntimeMetricsListResponseDto> {
    const states = Array.from(this.connectionStates)
      .filter((state) => state.source && state.socket.writable)

    if (!states.length) {
      return Promise.resolve({ items: [] })
    }

    return Promise.all(states.map((state) => this.requestRuntimeMetrics(state)))
      .then((items) => ({ items }))
  }

  private requestRuntimeMetrics(state: CollectorConnectionState): Promise<iSharedSystem.RuntimeMetricsItemDto> {
    const requestId = randomUUID()
    const source = state.source || "unknown-source"

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        this.pendingMetricsRequests.delete(requestId)
        resolve({
          source,
          status: "unavailable",
          reason: "Сервис не ответил на запрос метрик",
          checkedAt: new Date().toISOString()
        })
      }, this.metricsTimeoutMs)

      this.pendingMetricsRequests.set(requestId, {
        resolve,
        timeout
      })

      state.socket.write(`${JSON.stringify({
        collectorMessageType: "metrics_request",
        requestId
      })}\n`)
    })
  }

  private handleMetricsResponse(payload: unknown): boolean {
    if (!this.isMetricsResponse(payload)) return false

    const pending = this.pendingMetricsRequests.get(payload.requestId)
    if (!pending) return true

    clearTimeout(pending.timeout)
    this.pendingMetricsRequests.delete(payload.requestId)
    pending.resolve({
      status: "online",
      ...payload.metrics
    })
    return true
  }

  private isMetricsResponse(value: unknown): value is MetricsResponseMessage {
    if (typeof value !== "object" || value === null || Array.isArray(value)) return false
    const payload = value as Partial<MetricsResponseMessage>
    return payload.collectorMessageType === "metrics_response" && typeof payload.requestId === "string" && typeof payload.source === "string" && typeof payload.metrics === "object" && payload.metrics !== null
  }

  private normalizePayload(value: unknown): iSharedLogs.CollectLogPayloadDto {
    const payload = value as Partial<iSharedLogs.CollectLogPayloadDto>

    return {
      timestamp: payload.timestamp || new Date().toISOString(),
      kind: payload.kind || "application",
      level: payload.level || "info",
      source: payload.source || "unknown-source",
      message: payload.message || "Лог без сообщения",
      context: payload.context ?? null
    }
  }

  private handleDisconnect(state: CollectorConnectionState, hadError: boolean, socket: Socket): void {
    if (!state.source) return

    const payload: iSharedLogs.CollectLogPayloadDto = {
      timestamp: new Date().toISOString(),
      kind: "collector_disconnection",
      level: "error",
      source: state.source,
      message: "Потеряно подключение к log collector",
      context: {
        serviceName: this.constructor.name,
        serviceMethod: "handleDisconnect",
        hadError,
        remoteAddress: socket.remoteAddress || null,
        remotePort: socket.remotePort || null
      }
    }

    this.printCollectedLog(payload)
    this.service.collect(payload)
      .catch((error) => {
        this.logger.warn("Не удалось сохранить тревогу об отключении от log collector", {
          serviceName: this.constructor.name,
          serviceMethod: "handleDisconnect",
          error
        })
      })
  }

  private printCollectedLog(payload: iSharedLogs.CollectLogPayloadDto): void {
    if (!this.shouldPrintCollectedLogs) return

    console.log({
      timestamp: payload.timestamp,
      kind: payload.kind,
      level: payload.level,
      source: payload.source,
      message: payload.message,
      context: payload.context
    })
  }

  private normalizePort(value: string): number {
    const port = Number(value)
    if (!Number.isSafeInteger(port) || port <= 0) {
      throw new Error("VAR_LOG_COLLECTOR_SOCKET_PORT должен быть положительным числом")
    }

    return port
  }
}
