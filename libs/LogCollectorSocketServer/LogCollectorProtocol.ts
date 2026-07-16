import type {
  iLogCollectorConnectionState,
  iLogCollectorMetricsResponseMessage,
  iLogCollectorPackageAuthenticationMessage
} from "./types"

export class LogCollectorProtocol {
  isAuthenticationMessage(value: unknown): value is iLogCollectorPackageAuthenticationMessage {
    if (typeof value !== "object" || value === null || Array.isArray(value)) return false

    const payload = value as Partial<iLogCollectorPackageAuthenticationMessage>
    return payload.collectorMessageType === "package_authentication" && typeof payload.packageUid === "string"
  }

  isMetricsResponse(value: unknown): value is iLogCollectorMetricsResponseMessage {
    if (typeof value !== "object" || value === null || Array.isArray(value)) return false

    const payload = value as Partial<iLogCollectorMetricsResponseMessage>
    return payload.collectorMessageType === "metrics_response" && typeof payload.requestId === "string" && typeof payload.source === "string" && typeof payload.metrics === "object" && payload.metrics !== null
  }

  normalizePayload(value: unknown, state: iLogCollectorConnectionState): iSharedLogs.CollectLogPayloadDto {
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

  shouldStorePayload(payload: iSharedLogs.CollectLogPayloadDto): boolean {
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
}
