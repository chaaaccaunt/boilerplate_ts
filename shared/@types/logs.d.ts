declare global {
  namespace iSharedLogs {
    type LogLevel = "debug" | "info" | "warn" | "error"
    type LogKind = "application" | "collector_connection" | "collector_disconnection"
    type RuntimePackageConnectionEvent = "connected" | "disconnected"

    type LogValue =
      | string
      | number
      | boolean
      | null
      | undefined
      | LogValue[]
      | { [key: string]: LogValue }

    interface LogRecordDto {
      uid: string
      timestamp: string
      kind: LogKind
      level: LogLevel
      source: string
      packageUid: string
      message: string
      context: LogValue
    }

    interface PackageLogSummaryDto {
      logs: LogRecordDto[]
      warnCount: number
      errorCount: number
      limit: number
    }

    interface RuntimePackageConnectionEventDto {
      packageUid: string
      source: string
      event: RuntimePackageConnectionEvent
      timestamp: string
      level: LogLevel
      message: string
    }

    interface CollectLogPayloadDto {
      timestamp: string
      kind: LogKind
      level: LogLevel
      source: string
      packageUid: string
      message: string
      context: LogValue
    }

    interface CollectorAuthenticationMessageDto {
      collectorMessageType: "package_authentication"
      packageUid: string
      source: string
    }

    interface LogsListPayloadDto {
      limit?: number
      offset?: number
      level?: LogLevel
      kind?: LogKind
      packageUid?: string
    }

    interface LogsListResponseDto {
      logs: LogRecordDto[]
      total: number
      limit: number
      offset: number
    }
  }
}

export {}
