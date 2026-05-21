import { Controllers } from "@/controllers"
import { Database } from "@/database"
import { config, DatabaseServiceTools, getRequiredDatabaseConfig, HTTPServer, Logger } from "@/libs"
import { AuthorizationService } from "@/services/AuthorizationService"

const logger = new Logger()
const database = new Database(getRequiredDatabaseConfig())
const databaseTools = new DatabaseServiceTools(database.Sequelize, logger)
const httpServer = new HTTPServer(config.http)
const authorizationService = new AuthorizationService(database.models.User, database.models.UserSession, databaseTools, config.http)

new Controllers(httpServer, authorizationService)

start().catch((error) => {
  logger.error("Не удалось запустить authorization gateway", { error })
  process.exit(1)
})

function start(): Promise<void> {
  return database.sequelize.authenticate()
    .then(() => {
      httpServer.listen(config.http.port)
    })
}

export interface iDefaultEnvs { }
