import { Envs, Logger } from "@/libs"
import { DatabaseSetupService } from "@/services/DatabaseSetupService"

Envs.assignEnv()

const logger = new Logger()

const setupService = new DatabaseSetupService({
  databaseDialect: getOptionalEnv("VAR_DB_DIALECT") || "mysql",
  databaseHost: getRequiredEnv("VAR_DB_HOST"),
  databasePort: getOptionalEnv("VAR_DB_PORT"),
  databaseName: getRequiredEnv("VAR_DB_NAME"),
  serviceUserName: getRequiredEnv("VAR_DB_USER"),
  serviceUserPassword: getRequiredEnv("VAR_DB_PASSWORD"),
  serviceUserHost: getRequiredEnv("VAR_DB_SERVICE_HOST"),
  serviceUserGrants: [],
  runtimeUsers: getRuntimeUsers(),
  adminUserName: getRequiredEnv("VAR_DB_ADMIN_USER"),
  adminUserPassword: getRequiredEnv("VAR_DB_ADMIN_PASSWORD")
})

setupService.setupRuntimeGrants()
  .then(() => {
    logger.info("Runtime database grants настроены")
  })
  .catch((error) => {
    logger.error("Не удалось настроить runtime database grants", { error })
    process.exit(1)
  })

function getRequiredEnv(key: keyof NodeJS.ProcessEnv): string {
  const value = process.env[key]

  if (!value || value === "УкажитеЗначение") {
    throw new Error(`Не задана обязательная переменная окружения: ${key}`)
  }

  return value
}

function getOptionalEnv(key: keyof NodeJS.ProcessEnv): string | undefined {
  const value = process.env[key]
  if (!value || value === "УкажитеЗначение") return undefined

  return value
}

function getRuntimeUsers(): iDatabaseMigration.RuntimeUserConfig[] {
  const value = getRequiredEnv("VAR_DB_RUNTIME_GRANTS")

  try {
    const parsedValue: unknown = JSON.parse(value)
    if (!Array.isArray(parsedValue)) throw new Error("VAR_DB_RUNTIME_GRANTS должен быть JSON array")

    return parsedValue.map((item) => {
      if (!isRecord(item)) throw new Error("Runtime user grant должен быть object")

      return {
        userName: getStringField(item, "userName"),
        password: getStringField(item, "password"),
        host: getStringField(item, "host"),
        grants: getGrants(item)
      }
    })
  } catch (error) {
    if (error instanceof Error) throw error
    throw new Error("Некорректный JSON в VAR_DB_RUNTIME_GRANTS")
  }
}

function getGrants(value: Record<string, unknown>): iDatabaseMigration.RuntimeUserGrant[] {
  const grants = value.grants
  if (!Array.isArray(grants)) throw new Error("Runtime user grants должен быть array")

  return grants.map((grant) => {
    if (!isRecord(grant)) throw new Error("Runtime user grant должен быть object")

    const operations = grant.operations
    if (!Array.isArray(operations)) throw new Error("Runtime user grant operations должен быть array")

    return {
      table: getStringField(grant, "table"),
      operations: operations.map((operation) => {
        if (typeof operation !== "string") throw new Error("Runtime user grant operation должен быть string")
        return operation.trim().toUpperCase()
      }).filter(Boolean)
    }
  })
}

function getStringField(value: Record<string, unknown>, fieldName: string): string {
  const fieldValue = value[fieldName]
  if (typeof fieldValue !== "string" || !fieldValue.trim()) {
    throw new Error(`Не задано поле ${fieldName} в VAR_DB_RUNTIME_GRANTS`)
  }

  return fieldValue.trim()
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}
