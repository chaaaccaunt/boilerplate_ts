import Sequelize from "sequelize"
import { Logger } from "../Logger"

interface iDatabaseQueryLoggerOptions {
  requestId?: string
  serviceName: string
  serviceMethod: string
  event: string
  mutation?: boolean
}

export class DatabaseServiceTools {
  readonly Op: typeof Sequelize.Op
  readonly fn: typeof Sequelize.fn
  readonly col: typeof Sequelize.col
  readonly literal: typeof Sequelize.literal

  constructor(
    helpers: typeof Sequelize,
    private readonly logger: Logger
  ) {
    this.Op = helpers.Op
    this.fn = helpers.fn
    this.col = helpers.col
    this.literal = helpers.literal
  }

  createDatabaseQueryLogger(options: iDatabaseQueryLoggerOptions): (sql: string) => void {
    return (sql: string): void => {
      const context = {
        requestId: options.requestId,
        serviceName: options.serviceName,
        serviceMethod: options.serviceMethod,
        event: options.event,
        sql: this.sanitizeSql(sql)
      }

      if (options.mutation) {
        this.logger.info("DB mutation", context)
        return
      }

      this.logger.debug("DB call", context)
    }
  }

  sanitizeSql(sql: string): string {
    return this.redactPasswordAssignments(
      this.redactPasswordInsertValues(
        this.redactBcryptHashes(sql)
      )
    )
  }

  private redactBcryptHashes(sql: string): string {
    return sql.replace(/\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}/g, "[REDACTED_PASSWORD]")
  }

  private redactPasswordAssignments(sql: string): string {
    return sql.replace(/((?:`|"|')?password(?:`|"|')?\s*=\s*)(?:'[^']*'|"[^"]*"|[^\s,;)]+)/gi, "$1'[REDACTED_PASSWORD]'")
  }

  private redactPasswordInsertValues(sql: string): string {
    return sql.replace(
      /(INSERT\s+INTO\s+[`"A-Za-z0-9_.]+\s*\(([^)]*)\)\s+VALUES\s*)\(([^)]*)\)/gi,
      (match: string, prefix: string, rawColumns: string, rawValues: string): string => {
        const columns = this.splitSqlList(rawColumns).map((column) => this.normalizeSqlIdentifier(column))
        const passwordIndex = columns.indexOf("password")

        if (passwordIndex === -1) return match

        const values = this.splitSqlList(rawValues)
        if (passwordIndex >= values.length) return match

        values[passwordIndex] = "'[REDACTED_PASSWORD]'"

        return `${prefix}(${values.join(",")})`
      }
    )
  }

  private splitSqlList(value: string): string[] {
    const result: string[] = []
    let current = ""
    let quote: string | null = null

    for (let index = 0; index < value.length; index += 1) {
      const char = value[index]
      const previous = value[index - 1]

      if ((char === "'" || char === "\"") && previous !== "\\") {
        quote = quote === char ? null : quote || char
      }

      if (char === "," && !quote) {
        result.push(current.trim())
        current = ""
        continue
      }

      current += char
    }

    if (current.trim()) result.push(current.trim())

    return result
  }

  private normalizeSqlIdentifier(value: string): string {
    return value.trim().replace(/^[`"']+|[`"']+$/g, "").toLowerCase()
  }
}
