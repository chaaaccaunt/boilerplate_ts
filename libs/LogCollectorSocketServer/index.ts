import { randomUUID } from "crypto"
import { createServer, Server, Socket } from "net"
import { Logger } from "../Logger"
import { LogCollectorConnectionRegistry } from "./LogCollectorConnectionRegistry"
import { LogCollectorProtocol } from "./LogCollectorProtocol"
import { RuntimeMetrics } from "../RuntimeMetrics"
import type {
  iLogCollectorConnectionState,
  iLogCollectorPendingMetricsRequest,
  iLogCollectorRuntimeMetricsItemWithoutLogs,
  iLogCollectorRuntimePackage,
  iLogCollectorRuntimePackageEventClient,
  iLogCollectorService
} from "./types"

export class LogCollectorSocketServer {
  private readonly server: Server
  private readonly debugEnabled = process.env.VAR_APP_LOG_LEVEL === "debug"
  private readonly connections = new LogCollectorConnectionRegistry()
  private readonly protocol = new LogCollectorProtocol()
  private readonly runtimeMetrics = new RuntimeMetrics()
  private readonly pendingMetricsRequests = new Map<string, iLogCollectorPendingMetricsRequest>()
  private readonly metricsTimeoutMs = 1500

  constructor(
    private readonly port: string,
    private readonly service: iLogCollectorService,
    runtimePackages: iLogCollectorRuntimePackage[],
    private readonly runtimePackageEventGatewayClient: iLogCollectorRuntimePackageEventClient | null = null,
    private readonly logger = new Logger()
  ) {
    this.runtimePackages = new Map(runtimePackages.map((runtimePackage) => [runtimePackage.uid, runtimePackage]))
    this.server = createServer((socket) => this.handleConnection(socket))
  }

  private readonly runtimePackages: Map<string, iLogCollectorRuntimePackage>

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

    return Promise.all(states.map((state) => this.requestRuntimeMetrics(state)))
      .then((items) => this.appendLogCollectorRuntimeMetrics(items))
      .then((items) => this.appendUnavailableRuntimePackages(items))
      .then((items) => this.attachPackageLogSummaries(items))
      .then((items) => ({ items }))
  }

  collectRuntimeMetric(packageUid: string): Promise<iSharedSystem.RuntimeMetricsItemResponseDto> {
    const logCollectorRuntimePackage = this.getLogCollectorRuntimePackage()

    if (logCollectorRuntimePackage?.uid === packageUid) {
      return this.attachPackageLogSummary(this.createLogCollectorRuntimeMetricsItem(logCollectorRuntimePackage))
        .then((item) => ({ item }))
    }

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
    const state = this.connections.create(socket, randomUUID())

    socket.on("error", (error) => {
      this.logger.warn("Ошибка socket-соединения log collector", {
        serviceName: this.constructor.name,
        serviceMethod: "handleConnection",
        connectionId: state.connectionId,
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
        if (!state.authenticated) {
          state.socket.destroy()
          return null
        }
        if (this.handleMetricsResponse(payload, state)) return null
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
          connectionId: state.connectionId,
          error
        })
      })
  }

  private handleAuthentication(payload: unknown, state: iLogCollectorConnectionState): boolean {
    if (!this.protocol.isAuthenticationMessage(payload)) return false

    if (state.authenticated) {
      this.logger.warn("Повторная authentication в log collector socket отклонена", {
        serviceName: this.constructor.name,
        serviceMethod: "handleAuthentication",
        connectionId: state.connectionId,
        packageUid: state.packageUid || payload.packageUid,
        source: state.source || undefined
      })
      state.socket.destroy()
      return true
    }

    const runtimePackage = this.runtimePackages.get(payload.packageUid)
    if (!runtimePackage) {
      this.rejectAuthentication(state, payload.packageUid, "package_not_registered")
      return true
    }

    const duplicateStates = this.connections.closeDuplicatePackageConnections(runtimePackage.uid, state)
    if (duplicateStates.length) {
      this.logger.warn("Закрыты дублирующие соединения package с log collector", {
        serviceName: this.constructor.name,
        serviceMethod: "handleAuthentication",
        connectionId: state.connectionId,
        packageUid: runtimePackage.uid,
        source: runtimePackage.name,
        result: duplicateStates.map((duplicateState) => duplicateState.connectionId)
      })
    }

    this.connections.markAuthenticated(state, runtimePackage)

    return true
  }

  private rejectAuthentication(state: iLogCollectorConnectionState, packageUid: string, reason: string): void {
    this.logger.warn("Package не прошел authentication в log collector socket", {
      serviceName: this.constructor.name,
      serviceMethod: "handleAuthentication",
      connectionId: state.connectionId,
      packageUid,
      reason,
      ipAddress: state.socket.remoteAddress || null
    })
    state.socket.destroy()
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
        connectionId: state.connectionId,
        packageUid,
        resolve,
        timeout
      })

      state.socket.write(`${JSON.stringify({
        collectorMessageType: "metrics_request",
        requestId
      })}\n`)
    })
  }

  private handleMetricsResponse(payload: unknown, state: iLogCollectorConnectionState): boolean {
    if (!this.protocol.isMetricsResponse(payload)) return false

    const pending = this.pendingMetricsRequests.get(payload.requestId)
    if (!pending) return true
    if (pending.connectionId !== state.connectionId || pending.packageUid !== state.packageUid) return true
    const source = state.source || "unknown-source"

    clearTimeout(pending.timeout)
    this.pendingMetricsRequests.delete(payload.requestId)
    pending.resolve({
      status: "online",
      ...payload.metrics,
      packageUid: pending.packageUid,
      source,
      packageKind: this.getPackageKind(source),
      connectionIpAddress: this.getMetricsConnectionIpAddress(pending.packageUid)
    })
    return true
  }

  private getMetricsConnectionIpAddress(packageUid: string): string | null {
    const state = this.connections.findByPackageUid(packageUid)
    return state?.socket.remoteAddress || null
  }

  private appendUnavailableRuntimePackages(items: iLogCollectorRuntimeMetricsItemWithoutLogs[]): iLogCollectorRuntimeMetricsItemWithoutLogs[] {
    const itemPackageUids = new Set(items.map((item) => item.packageUid))
    const checkedAt = new Date().toISOString()
    const unavailableItems = Array.from(this.runtimePackages.values())
      .filter((runtimePackage) => !itemPackageUids.has(runtimePackage.uid))
      .map((runtimePackage) => {
        const offlineState = this.connections.getOfflinePackageState(runtimePackage.uid)

        if (offlineState) {
          return this.createOfflineMetricsItem(offlineState.packageUid, offlineState.source, offlineState.reason, offlineState.disconnectedAt)
        }

        return this.createOfflineMetricsItem(
          runtimePackage.uid,
          runtimePackage.name,
          "Package не подключен к log collector",
          checkedAt
        )
      })

    return items.concat(unavailableItems)
  }

  private appendLogCollectorRuntimeMetrics(items: iLogCollectorRuntimeMetricsItemWithoutLogs[]): iLogCollectorRuntimeMetricsItemWithoutLogs[] {
    const logCollectorRuntimePackage = this.getLogCollectorRuntimePackage()

    if (!logCollectorRuntimePackage) return items
    if (items.some((item) => item.packageUid === logCollectorRuntimePackage.uid)) return items

    return items.concat(this.createLogCollectorRuntimeMetricsItem(logCollectorRuntimePackage))
  }

  private createLogCollectorRuntimeMetricsItem(runtimePackage: iLogCollectorRuntimePackage): iLogCollectorRuntimeMetricsItemWithoutLogs {
    return {
      status: "online",
      ...this.runtimeMetrics.collect(runtimePackage.name, runtimePackage.uid, null)
    }
  }

  private getLogCollectorRuntimePackage(): iLogCollectorRuntimePackage | null {
    const packageUid = process.env.VAR_PACKAGE_UID

    if (!packageUid) return null

    return this.runtimePackages.get(packageUid) || null
  }

  private getPackageKind(source: string): iSharedSystem.RuntimePackageKind {
    if (source.endsWith("-service")) return "service"
    if (source.endsWith("-gateway")) return "gateway"
    return "unknown"
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
    if (state.skipDisconnectEvent) return
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
