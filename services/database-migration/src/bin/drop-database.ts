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
  runtimeUsers: [],
  adminUserName: getRequiredEnv("VAR_DB_ADMIN_USER"),
  adminUserPassword: getRequiredEnv("VAR_DB_ADMIN_PASSWORD")
})

setupService.dropDevelopmentDatabase()
  .then(() => {
    logger.info("База данных разработки удалена")
  })
  .catch((error) => {
    logger.error("Не удалось удалить базу данных разработки", { error })
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
