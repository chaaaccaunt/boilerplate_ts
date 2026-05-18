declare global {
  namespace iSharedLogs {
    type LogLevel = "debug" | "info" | "warn" | "error"
    type LogKind = "application" | "collector_connection" | "collector_disconnection"

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
      message: string
      context: LogValue
    }

    interface CollectLogPayloadDto {
      timestamp: string
      kind: LogKind
      level: LogLevel
      source: string
      message: string
      context: LogValue
    }

    interface LogsListPayloadDto {
      limit?: number
      offset?: number
      level?: LogLevel
      kind?: LogKind
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
