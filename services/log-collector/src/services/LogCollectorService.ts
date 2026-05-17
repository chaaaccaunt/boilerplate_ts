import { Exceptions } from "@/libs"

export class LogCollectorService {
  constructor(private readonly models: iDatabase.Models) {}

  collect(payload: iSharedLogs.CollectLogPayloadDto): Promise<iSharedLogs.LogRecordDto> {
    return this.models.LogRecord.create({
      timestamp: new Date(payload.timestamp),
      level: payload.level,
      source: payload.source,
      message: payload.message,
      context: this.normalizeContext(payload.context)
    })
      .then((record) => this.toDto(record))
  }

  list(payload: iSharedLogs.LogsListPayloadDto = {}): Promise<iSharedLogs.LogsListResponseDto> {
    const limit = this.getLimit(payload.limit)
    const where = payload.level ? { level: payload.level } : undefined

    return this.models.LogRecord.findAll({
      where,
      limit,
      order: [["timestamp", "DESC"]]
    })
      .then((records) => ({
        logs: records.map((record) => this.toDto(record))
      }))
  }

  private toDto(record: iDatabase.Models["LogRecord"]["prototype"]): iSharedLogs.LogRecordDto {
    return {
      uid: record.uid,
      timestamp: record.timestamp.toISOString(),
      level: record.level,
      source: record.source,
      message: record.message,
      context: record.context
    }
  }

  private normalizeContext(value: iSharedLogs.LogValue): iSharedLogs.LogValue {
    return value === undefined ? null : value
  }

  private getLimit(value: number | undefined): number {
    if (value === undefined) return 200
    if (!Number.isSafeInteger(value) || value < 1 || value > 1000) {
      throw new Exceptions.ServiceError.ConflictError("Некорректный лимит логов")
    }

    return value
  }
}
