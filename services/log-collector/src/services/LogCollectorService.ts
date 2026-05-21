import { Exceptions } from "@/libs"
import type { UUID } from "crypto"

export class LogCollectorService {
  constructor(
    private readonly models: iDatabase.Models,
    private readonly databaseTools: iLibs.DatabaseServiceTools
  ) {}

  collect(payload: iSharedLogs.CollectLogPayloadDto): Promise<iSharedLogs.LogRecordDto> {
    return this.models.LogRecord.create({
      timestamp: new Date(payload.timestamp),
      packageUid: payload.packageUid as UUID,
      kind: payload.kind,
      level: payload.level,
      source: payload.source,
      message: payload.message,
      context: this.normalizeContext(payload.context)
    }, {
      logging: this.databaseTools.createDatabaseQueryLogger({
        requestId: this.getPayloadRequestId(payload),
        serviceName: this.constructor.name,
        serviceMethod: "collect",
        event: "log_records insert query",
        mutation: true
      })
    })
      .then((record) => this.toDto(record))
  }

  findRuntimePackage(uid: string): Promise<iDatabase.Models["RuntimePackage"]["prototype"] | null> {
    return this.models.RuntimePackage.findByPk(uid)
  }

  collectConnectionEvent(payload: {
    packageUid: string
    event: iSharedLogs.RuntimePackageConnectionEvent
    timestamp: string
    details: iSharedLogs.LogValue
  }): Promise<void> {
    return this.models.RuntimePackageConnection.create({
      packageUid: payload.packageUid as UUID,
      event: payload.event,
      timestamp: new Date(payload.timestamp),
      details: this.normalizeContext(payload.details)
    }, {
      logging: this.databaseTools.createDatabaseQueryLogger({
        serviceName: this.constructor.name,
        serviceMethod: "collectConnectionEvent",
        event: "runtime_package_connections insert query",
        mutation: true
      })
    })
      .then(() => undefined)
  }

  list(payload: iSharedLogs.LogsListPayloadDto = {}): Promise<iSharedLogs.LogsListResponseDto> {
    const limit = this.getLimit(payload.limit)
    const offset = this.getOffset(payload.offset)
    const where = {
      ...(payload.level ? { level: payload.level } : {}),
      ...(payload.kind ? { kind: payload.kind } : {})
    }

    return this.models.LogRecord.findAndCountAll({
      where: Object.keys(where).length ? where : undefined,
      limit,
      offset,
      order: [["timestamp", "DESC"]]
    })
      .then((result) => ({
        logs: result.rows.map((record) => this.toDto(record)),
        total: result.count,
        limit,
        offset
      }))
  }

  private toDto(record: iDatabase.Models["LogRecord"]["prototype"]): iSharedLogs.LogRecordDto {
    return {
      uid: record.uid,
      timestamp: record.timestamp.toISOString(),
      packageUid: record.packageUid,
      kind: record.kind,
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
    if (value === undefined) return 50
    if (!Number.isSafeInteger(value) || value < 1 || value > 300) {
      throw new Exceptions.ServiceError.ConflictError("Некорректный лимит логов")
    }

    return value
  }

  private getOffset(value: number | undefined): number {
    if (value === undefined) return 0
    if (!Number.isSafeInteger(value) || value < 0) {
      throw new Exceptions.ServiceError.ConflictError("Некорректное смещение логов")
    }

    return value
  }

  private getPayloadRequestId(payload: iSharedLogs.CollectLogPayloadDto): string | undefined {
    const context = payload.context

    if (!context || typeof context !== "object" || Array.isArray(context)) return undefined

    const requestId = context.requestId
    return typeof requestId === "string" ? requestId : undefined
  }
}
