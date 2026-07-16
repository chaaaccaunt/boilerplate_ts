import { Database } from "@/database"
import { UsersController } from "@/controllers"
import { config, DatabaseServiceTools, getRequiredDatabaseConfig, Logger, MicroServiceHTTPServer } from "@/libs"
import { ServiceTokenEncryptionService } from "@/services/ServiceTokenEncryptionService"
import { UsersService } from "@/services/UsersService"

const logger = new Logger()
const database = new Database(getRequiredDatabaseConfig())
const httpServer = new MicroServiceHTTPServer({ port: config.http.port })
const databaseTools = new DatabaseServiceTools(database.Sequelize, logger)
const serviceTokenEncryptionService = new ServiceTokenEncryptionService(getRequiredServiceTokenEncryptionKey())
const service = new UsersService(database.models.User, database.models.Role, database.models.Permission, database.models.RolePermission, database.models.UserRole, database.models.ServiceToken, databaseTools, serviceTokenEncryptionService)

httpServer.use([...new UsersController(service).getRoutes()])

start().catch((error) => {
  logger.error("Не удалось запустить users service", { error })
  process.exit(1)
})

function start(): Promise<void> {
  return database.sequelize.authenticate()
    .then(() => {
      httpServer.listen(config.http.port)
    })
}

export interface iDefaultEnvs { }

function getRequiredServiceTokenEncryptionKey(): string {
  const value = process.env.VAR_SERVICE_TOKEN_ENCRYPTION_KEY

  if (!value || value === "УкажитеЗначение") {
    throw new Error("Отсутствует обязательная переменная окружения: VAR_SERVICE_TOKEN_ENCRYPTION_KEY")
  }

  return value
}
