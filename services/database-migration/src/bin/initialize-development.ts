import { Envs, getRequiredDatabaseConfig, Logger } from "@/libs"
import { Database } from "../database"
import { DatabaseMigrationService } from "../services/DatabaseMigrationService"
import { DatabaseSetupService, DevelopmentDatabaseInitializationStep } from "../services/DatabaseSetupService"
import { DevelopmentSeedService } from "../services/DevelopmentSeedService"
import { MockDataSeedService } from "../services/MockDataSeedService"

Envs.assignEnv()

const logger = new Logger()
const setupService = new DatabaseSetupService({
  databaseDialect: getRequiredEnv("VAR_DB_DIALECT"),
  databaseHost: getRequiredEnv("VAR_DB_HOST"),
  databasePort: getOptionalEnv("VAR_DB_PORT"),
  databaseName: getRequiredEnv("VAR_DB_NAME"),
  serviceUserName: getRequiredEnv("VAR_DB_USER"),
  serviceUserPassword: getRequiredEnv("VAR_DB_PASSWORD"),
  serviceUserHost: getRequiredEnv("VAR_DB_SERVICE_HOST"),
  serviceUserGrants: getRequiredEnv("VAR_DB_SERVICE_GRANTS")
    .split(",")
    .map((grantName) => grantName.trim().toUpperCase())
    .filter(Boolean),
  runtimeUsers: getRuntimeUsers(),
  adminUserName: getRequiredEnv("VAR_DB_ADMIN_USER"),
  adminUserPassword: getRequiredEnv("VAR_DB_ADMIN_PASSWORD")
})

setupService.initializeDevelopmentDatabase(initializeDatabase, logCompletedStep)
  .then(() => {
    logger.info("База данных разработки инициализирована")
  })
  .catch((error) => {
    logger.error("Не удалось инициализировать базу данных разработки", { error })
    process.exit(1)
  })

function initializeDatabase(): Promise<void> {
  const database = new Database(getRequiredDatabaseConfig())
  const migrationService = new DatabaseMigrationService(database.sequelize)
  const seedService = new DevelopmentSeedService(database.sequelize)
  const mockDataSeedService = new MockDataSeedService(database.sequelize)

  return database.sequelize.authenticate()
    .then(() => migrationService.migrate())
    .then(() => {
      logger.info("Миграции базы данных выполнены")
    })
    .then(() => seedService.seed())
    .then(() => {
      logger.info("Development seed выполнен")
    })
    .then(() => isMockDataEnabled() ? mockDataSeedService.seed() : undefined)
    .then(() => {
      if (isMockDataEnabled()) logger.info("Mock-данные созданы")
    })
    .then(() => database.sequelize.close())
    .catch((error) => database.sequelize.close()
      .catch(() => undefined)
      .then(() => Promise.reject(error)))
}

function isMockDataEnabled(): boolean {
  return process.env.VAR_DB_GENERATE_MOCK_DATA === "true"
}

function logCompletedStep(step: DevelopmentDatabaseInitializationStep): void {
  const messages: Record<DevelopmentDatabaseInitializationStep, string> = {
    "drop-database": "База данных разработки удалена",
    setup: "База данных и пользователь сервиса настроены",
    "runtime-grants": "Runtime database grants настроены"
  }

  logger.info(messages[step])
}

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
  const parsedValue: unknown = JSON.parse(value)

  if (!Array.isArray(parsedValue)) throw new Error("VAR_DB_RUNTIME_GRANTS должен быть JSON array")

  return parsedValue.map((item) => {
    if (!isRecord(item)) throw new Error("Runtime user grant должен быть object")

    return {
      userName: getStringField(item, "userName"),
      password: getStringField(item, "password"),
      host: getStringField(item, "host"),
      grants: getRuntimeUserGrants(item)
    }
  })
}

function getRuntimeUserGrants(value: Record<string, unknown>): iDatabaseMigration.RuntimeUserGrant[] {
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
