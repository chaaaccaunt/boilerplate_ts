declare global {
  namespace iSharedLogs {
    type LogLevel = "debug" | "info" | "warn" | "error"

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
      level: LogLevel
      source: string
      message: string
      context: LogValue
    }

    interface CollectLogPayloadDto {
      timestamp: string
      level: LogLevel
      source: string
      message: string
      context: LogValue
    }

    interface LogsListPayloadDto {
      limit?: number
      level?: LogLevel
    }

    interface LogsListResponseDto {
      logs: LogRecordDto[]
    }
  }
}

export {}
