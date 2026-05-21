import type { Socket } from "net"

export interface iLogCollectorConnectionState {
  authenticated: boolean
  authenticating: Promise<void> | null
  packageUid: string | null
  source: string | null
  socket: Socket
}

export interface iLogCollectorOfflinePackageState {
  packageUid: string
  source: string
  connectionIpAddress: string | null
  disconnectedAt: string
  reason: string
}

export interface iLogCollectorPackageAuthenticationMessage {
  collectorMessageType: "package_authentication"
  packageUid: string
  source: string
}

export interface iLogCollectorMetricsRequestMessage {
  collectorMessageType: "metrics_request"
  requestId: string
}

export interface iLogCollectorMetricsResponseMessage {
  collectorMessageType: "metrics_response"
  requestId: string
  source: string
  metrics: iSharedSystem.RuntimeMetricsDto
}

export interface iLogCollectorPendingMetricsRequest {
  resolve: (item: iLogCollectorRuntimeMetricsItemWithoutLogs) => void
  timeout: NodeJS.Timeout
}

export type iLogCollectorRuntimeMetricsItemWithoutLogs =
  | ({ status: "online" } & iSharedSystem.RuntimeMetricsDto)
  | iSharedSystem.RuntimeMetricsUnavailableDto

export interface iLogCollectorRuntimePackage {
  uid: string
  name: string
}

export interface iLogCollectorService {
  findRuntimePackage(uid: string): Promise<iLogCollectorRuntimePackage | null>
  collect(payload: iSharedLogs.CollectLogPayloadDto): Promise<unknown>
  collectConnectionEvent(payload: {
    packageUid: string
    event: iSharedLogs.RuntimePackageConnectionEvent
    timestamp: string
    details: iSharedLogs.LogValue
  }): Promise<void>
  getPackageLogSummary(packageUid: string, limit?: number): Promise<iSharedLogs.PackageLogSummaryDto>
}

export interface iLogCollectorRuntimePackageEventClient {
  notify(payload: iSharedLogs.RuntimePackageConnectionEventDto): Promise<void>
}
