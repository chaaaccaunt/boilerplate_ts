import { randomUUID } from "crypto"
import { createServer, Server, Socket } from "net"
import { Logger } from "../Logger"
import { LogCollectorConnectionRegistry } from "./LogCollectorConnectionRegistry"
import { LogCollectorProtocol } from "./LogCollectorProtocol"
import type {
  iLogCollectorConnectionState,
  iLogCollectorPendingMetricsRequest,
  iLogCollectorRuntimeMetricsItemWithoutLogs,
  iLogCollectorRuntimePackageEventClient,
  iLogCollectorService
} from "./types"

export class LogCollectorSocketServer {
  private readonly server: Server
  private readonly debugEnabled = process.env.VAR_APP_LOG_LEVEL === "debug"
  private readonly connections = new LogCollectorConnectionRegistry()
  private readonly protocol = new LogCollectorProtocol()
  private readonly pendingMetricsRequests = new Map<string, iLogCollectorPendingMetricsRequest>()
  private readonly metricsTimeoutMs = 1500

  constructor(
    private readonly port: string,
    private readonly service: iLogCollectorService,
    private readonly runtimePackageEventGatewayClient: iLogCollectorRuntimePackageEventClient | null = null,
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

  collectRuntimeMetrics(): Promise<iSharedSystem.RuntimeMetricsListResponseDto> {
    const states = this.connections.getWritableAuthenticatedStates()
    const onlinePackageUids = this.connections.getOnlinePackageUids()

    return Promise.all(states.map((state) => this.requestRuntimeMetrics(state)))
      .then((items) => items.concat(
        this.connections.getOfflinePackageStatesExcluding(onlinePackageUids)
          .map((state) => this.createOfflineMetricsItem(state.packageUid, state.source, state.reason, state.disconnectedAt))
      ))
      .then((items) => this.attachPackageLogSummaries(items))
      .then((items) => ({ items }))
  }

  collectRuntimeMetric(packageUid: string): Promise<iSharedSystem.RuntimeMetricsItemResponseDto> {
    const state = this.connections.findWritableByPackageUid(packageUid)

    if (!state) {
      const offlineState = this.connections.getOfflinePackageState(packageUid)

      if (offlineState) {
        return this.attachPackageLogSummary(this.createOfflineMetricsItem(offlineState.packageUid, offlineState.source, offlineState.reason, offlineState.disconnectedAt))
          .then((item) => ({ item }))
      }

      return this.attachPackageLogSummary(this.createOfflineMetricsItem(
        packageUid,
        "unknown-source",
        "Package не подключен к log collector",
        new Date().toISOString()
      ))
        .then((item) => ({ item }))
    }

    return this.requestRuntimeMetrics(state)
      .then((item) => this.attachPackageLogSummary(item))
      .then((item) => ({ item }))
  }

  private handleConnection(socket: Socket): void {
    socket.setEncoding("utf8")
    let buffer = ""
    const state = this.connections.create(socket)

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
      this.connections.delete(state)
      this.handleDisconnect(state, hadError, socket)
    })
  }

  private handleLine(line: string, state: iLogCollectorConnectionState): void {
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
            return this.protocol.normalizePayload(payload, state)
          })
        }
        if (!state.authenticated) {
          state.socket.destroy()
          return null
        }
        if (this.handleMetricsResponse(payload)) return null
        return this.protocol.normalizePayload(payload, state)
      })
      .then((payload) => {
        if (!payload) return null
        this.printCollectedLog(payload)
        if (!this.protocol.shouldStorePayload(payload)) return null

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

  private handleAuthentication(payload: unknown, state: iLogCollectorConnectionState): boolean {
    if (!this.protocol.isAuthenticationMessage(payload)) return false

    state.authenticating = this.service.findRuntimePackage(payload.packageUid)
      .then((runtimePackage) => {
        if (!runtimePackage || runtimePackage.name !== payload.source) {
          state.socket.destroy()
          return
        }

        this.connections.markAuthenticated(state, runtimePackage)
      })
      .catch(() => state.socket.destroy())
      .then(() => {
        state.authenticating = null
      })

    return true
  }

  private requestRuntimeMetrics(state: iLogCollectorConnectionState): Promise<iLogCollectorRuntimeMetricsItemWithoutLogs> {
    const requestId = randomUUID()
    const source = state.source || "unknown-source"
    const packageUid = state.packageUid || "unknown-package"

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        this.pendingMetricsRequests.delete(requestId)
        resolve(this.createOfflineMetricsItem(packageUid, source, "Сервис не ответил на запрос метрик", new Date().toISOString()))
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
    if (!this.protocol.isMetricsResponse(payload)) return false

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
    const state = this.connections.findByPackageUid(packageUid)
    return state?.socket.remoteAddress || null
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

  private handleDisconnect(state: iLogCollectorConnectionState, hadError: boolean, socket: Socket): void {
    if (!state.source || !state.packageUid) return

    this.connections.rememberOffline(state, new Date().toISOString())

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

  private createOfflineMetricsItem(packageUid: string, source: string, reason: string, checkedAt: string): iLogCollectorRuntimeMetricsItemWithoutLogs {
    return {
      packageUid,
      source,
      status: "unavailable",
      reason,
      checkedAt
    }
  }

  private attachPackageLogSummaries(items: iLogCollectorRuntimeMetricsItemWithoutLogs[]): Promise<iSharedSystem.RuntimeMetricsItemDto[]> {
    return Promise.all(items.map((item) => this.attachPackageLogSummary(item)))
  }

  private attachPackageLogSummary<TItem extends iLogCollectorRuntimeMetricsItemWithoutLogs>(item: TItem): Promise<TItem & { logSummary: iSharedLogs.PackageLogSummaryDto }> {
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

export type {
  iLogCollectorRuntimePackageEventClient,
  iLogCollectorService
} from "./types"
