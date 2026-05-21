import { randomUUID } from "crypto"
import { createServer, Server, Socket } from "net"
import { Logger } from "@/libs"
import { LogCollectorService } from "./LogCollectorService"
import { RuntimePackageEventGatewayClient } from "./RuntimePackageEventGatewayClient"

interface CollectorConnectionState {
  authenticated: boolean
  authenticating: Promise<void> | null
  packageUid: string | null
  source: string | null
  socket: Socket
}

interface OfflinePackageState {
  packageUid: string
  source: string
  connectionIpAddress: string | null
  disconnectedAt: string
  reason: string
}

interface PackageAuthenticationMessage {
  collectorMessageType: "package_authentication"
  packageUid: string
  source: string
}

interface MetricsResponseMessage {
  collectorMessageType: "metrics_response"
  requestId: string
  source: string
  metrics: iSharedSystem.RuntimeMetricsDto
}

interface PendingMetricsRequest {
  resolve: (item: RuntimeMetricsItemWithoutLogs) => void
  timeout: NodeJS.Timeout
}

type RuntimeMetricsItemWithoutLogs =
  | ({ status: "online" } & iSharedSystem.RuntimeMetricsDto)
  | iSharedSystem.RuntimeMetricsUnavailableDto

export class LogCollectorSocketServer {
  private readonly server: Server
  private readonly debugEnabled = process.env.VAR_APP_LOG_LEVEL === "debug"
  private readonly connectionStates = new Set<CollectorConnectionState>()
  private readonly offlinePackageStates = new Map<string, OfflinePackageState>()
  private readonly pendingMetricsRequests = new Map<string, PendingMetricsRequest>()
  private readonly metricsTimeoutMs = 1500

  constructor(
    private readonly port: string,
    private readonly service: LogCollectorService,
    private readonly runtimePackageEventGatewayClient: RuntimePackageEventGatewayClient | null = null,
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
      authenticated: false,
      authenticating: null,
      packageUid: null,
      source: null,
      socket
    }
    this.connectionStates.add(state)

    socket.on("error", (error) => {
      this.logger.warn("Ошибка socket-соединения log collector", {
        serviceName: this.constructor.name,
        serviceMethod: "handleConnection",
        error
      })
    })

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
        if (this.handleAuthentication(payload, state)) return null
        if (state.authenticating) {
          return state.authenticating.then(() => {
            if (!state.authenticated) {
              state.socket.destroy()
              return null
            }

            if (this.handleMetricsResponse(payload)) return null
            return this.normalizePayload(payload, state)
          })
        }
        if (!state.authenticated) {
          state.socket.destroy()
          return null
        }
        if (this.handleMetricsResponse(payload)) return null
        return this.normalizePayload(payload, state)
      })
      .then((payload) => {
        if (!payload) return null
        this.printCollectedLog(payload)
        if (!this.shouldStorePayload(payload)) return null
        return this.service.collect(payload)
          .then(() => this.collectConnectionEventIfNeeded(payload))
      })
      .catch((error) => {
        this.logger.warn("Не удалось сохранить log record", {
          serviceName: this.constructor.name,
          serviceMethod: "handleLine",
          error
        })
      })
  }

  private handleAuthentication(payload: unknown, state: CollectorConnectionState): boolean {
    if (!this.isAuthenticationMessage(payload)) return false

    state.authenticating = this.service.findRuntimePackage(payload.packageUid)
      .then((runtimePackage) => {
        if (!runtimePackage || runtimePackage.name !== payload.source) {
          state.socket.destroy()
          return
        }

        state.authenticated = true
        state.packageUid = runtimePackage.uid
        state.source = runtimePackage.name
        this.offlinePackageStates.delete(runtimePackage.uid)
      })
      .catch(() => state.socket.destroy())
      .then(() => {
        state.authenticating = null
      })

    return true
  }

  private isAuthenticationMessage(value: unknown): value is PackageAuthenticationMessage {
    if (typeof value !== "object" || value === null || Array.isArray(value)) return false
    const payload = value as Partial<PackageAuthenticationMessage>
    return payload.collectorMessageType === "package_authentication" && typeof payload.packageUid === "string" && typeof payload.source === "string"
  }

  collectRuntimeMetrics(): Promise<iSharedSystem.RuntimeMetricsListResponseDto> {
    const states = Array.from(this.connectionStates)
      .filter((state) => state.source && state.socket.writable)
    const onlinePackageUids = new Set(states.map((state) => state.packageUid).filter((value): value is string => Boolean(value)))

    return Promise.all(states.map((state) => this.requestRuntimeMetrics(state)))
      .then((items) => items.concat(
          Array.from(this.offlinePackageStates.values())
            .filter((state) => !onlinePackageUids.has(state.packageUid))
            .map((state) => this.createOfflineMetricsItem(state))
        ))
      .then((items) => this.attachPackageLogSummaries(items))
      .then((items) => ({ items }))
  }

  collectRuntimeMetric(packageUid: string): Promise<iSharedSystem.RuntimeMetricsItemResponseDto> {
    const state = Array.from(this.connectionStates)
      .find((item) => item.packageUid === packageUid && item.source && item.socket.writable)

    if (!state) {
      const offlineState = this.offlinePackageStates.get(packageUid)

      if (offlineState) {
        return this.attachPackageLogSummary(this.createOfflineMetricsItem(offlineState))
          .then((item) => ({ item }))
      }

      return this.attachPackageLogSummary({
          packageUid,
          source: "unknown-source",
          status: "unavailable",
          reason: "Package не подключен к log collector",
          checkedAt: new Date().toISOString()
        })
        .then((item) => ({ item }))
    }

    return this.requestRuntimeMetrics(state)
      .then((item) => this.attachPackageLogSummary(item))
      .then((item) => ({ item }))
  }

  private requestRuntimeMetrics(state: CollectorConnectionState): Promise<RuntimeMetricsItemWithoutLogs> {
    const requestId = randomUUID()
    const source = state.source || "unknown-source"
    const packageUid = state.packageUid || "unknown-package"

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        this.pendingMetricsRequests.delete(requestId)
        resolve({
          packageUid,
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
      ...payload.metrics,
      packageUid: payload.metrics.packageUid || "unknown-package",
      connectionIpAddress: this.getMetricsConnectionIpAddress(payload.metrics.packageUid)
    })
    return true
  }

  private getMetricsConnectionIpAddress(packageUid: string): string | null {
    const state = Array.from(this.connectionStates).find((item) => item.packageUid === packageUid)
    return state?.socket.remoteAddress || null
  }

  private isMetricsResponse(value: unknown): value is MetricsResponseMessage {
    if (typeof value !== "object" || value === null || Array.isArray(value)) return false
    const payload = value as Partial<MetricsResponseMessage>
    return payload.collectorMessageType === "metrics_response" && typeof payload.requestId === "string" && typeof payload.source === "string" && typeof payload.metrics === "object" && payload.metrics !== null
  }

  private normalizePayload(value: unknown, state: CollectorConnectionState): iSharedLogs.CollectLogPayloadDto {
    const payload = value as Partial<iSharedLogs.CollectLogPayloadDto>

    return {
      timestamp: payload.timestamp || new Date().toISOString(),
      kind: payload.kind || "application",
      level: payload.level || "info",
      source: state.source || "unknown-source",
      packageUid: state.packageUid || "",
      message: payload.message || "Лог без сообщения",
      context: payload.context ?? null
    }
  }

  private shouldStorePayload(payload: iSharedLogs.CollectLogPayloadDto): boolean {
    if (payload.kind === "collector_connection" || payload.kind === "collector_disconnection") return true
    if (payload.level === "error" || payload.level === "warn") return true

    const context = payload.context
    if (!context || typeof context !== "object" || Array.isArray(context)) return false

    const method = context.method
    if (method === "POST" || method === "PATCH" || method === "DELETE") return true
    if (context.mutation === true) return true

    const serviceMethod = context.serviceMethod
    if (typeof serviceMethod === "string" && /^(create|update|delete|send|leave|revoke|login)/.test(serviceMethod)) return true

    return false
  }

  private collectConnectionEventIfNeeded(payload: iSharedLogs.CollectLogPayloadDto): Promise<void> {
    if (payload.kind !== "collector_connection") return Promise.resolve()

    return this.service.collectConnectionEvent({
      packageUid: payload.packageUid,
      event: "connected",
      timestamp: payload.timestamp,
      details: payload.context
    })
      .then(() => this.notifyRuntimePackageConnectionEvent({
        packageUid: payload.packageUid,
        source: payload.source,
        event: "connected",
        timestamp: payload.timestamp,
        level: payload.level,
        message: payload.message
      }))
  }

  private handleDisconnect(state: CollectorConnectionState, hadError: boolean, socket: Socket): void {
    if (!state.source || !state.packageUid) return

    this.offlinePackageStates.set(state.packageUid, {
      packageUid: state.packageUid,
      source: state.source,
      connectionIpAddress: socket.remoteAddress || null,
      disconnectedAt: new Date().toISOString(),
      reason: "Package отключился от log collector"
    })

    const payload: iSharedLogs.CollectLogPayloadDto = {
      timestamp: new Date().toISOString(),
      kind: "collector_disconnection",
      level: "error",
      source: state.source,
      packageUid: state.packageUid,
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
      .then(() => this.service.collectConnectionEvent({
        packageUid: state.packageUid || "",
        event: "disconnected",
        timestamp: payload.timestamp,
        details: payload.context
      }))
      .then(() => this.notifyRuntimePackageConnectionEvent({
        packageUid: payload.packageUid,
        source: payload.source,
        event: "disconnected",
        timestamp: payload.timestamp,
        level: payload.level,
        message: payload.message
      }))
      .catch((error) => {
        this.logger.warn("Не удалось сохранить тревогу об отключении от log collector", {
          serviceName: this.constructor.name,
          serviceMethod: "handleDisconnect",
          error
        })
      })
  }

  private createOfflineMetricsItem(state: OfflinePackageState): RuntimeMetricsItemWithoutLogs {
    return {
      packageUid: state.packageUid,
      source: state.source,
      status: "unavailable",
      reason: state.reason,
      checkedAt: state.disconnectedAt
    }
  }

  private attachPackageLogSummaries(items: RuntimeMetricsItemWithoutLogs[]): Promise<iSharedSystem.RuntimeMetricsItemDto[]> {
    return Promise.all(items.map((item) => this.attachPackageLogSummary(item)))
  }

  private attachPackageLogSummary<TItem extends RuntimeMetricsItemWithoutLogs>(item: TItem): Promise<TItem & { logSummary: iSharedLogs.PackageLogSummaryDto }> {
    return this.service.getPackageLogSummary(item.packageUid)
      .then((logSummary) => ({
        ...item,
        logSummary
      }))
      .catch(() => ({
        ...item,
        logSummary: {
          logs: [],
          warnCount: 0,
          errorCount: 0,
          limit: 3
        }
      }))
  }

  private notifyRuntimePackageConnectionEvent(payload: iSharedLogs.RuntimePackageConnectionEventDto): Promise<void> {
    if (!this.runtimePackageEventGatewayClient) return Promise.resolve()

    return this.runtimePackageEventGatewayClient.notify(payload)
      .catch((error) => {
        this.logger.warn("Не удалось отправить событие package lifecycle в chat realtime gateway", {
          serviceName: this.constructor.name,
          serviceMethod: "notifyRuntimePackageConnectionEvent",
          event: payload.event,
          error
        })
      })
  }

  private printCollectedLog(payload: iSharedLogs.CollectLogPayloadDto): void {
    if (!this.debugEnabled) return

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
