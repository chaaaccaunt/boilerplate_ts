import { Controllers } from "../controllers"
import { Database } from "../database"
import { config, DatabaseServiceTools, getRequiredDatabaseConfig, HTTPServer, Logger, ProcessCluster } from "@/libs"
import { AuthorizationService } from "../services/AuthorizationService"

ProcessCluster.run(config.process, startApplication, (error) => {
  const logger = new Logger()
  logger.error("Не удалось запустить authorization gateway", { error: error instanceof Error ? error : String(error) })
})

function startApplication(): Promise<void> {
  const logger = new Logger()
  const database = new Database(getRequiredDatabaseConfig())
  const databaseTools = new DatabaseServiceTools(database.Sequelize, logger)
  const httpServer = new HTTPServer(config.http)
  const authorizationService = new AuthorizationService(database.models.User, database.models.UserSession, databaseTools, config.http)

  new Controllers(httpServer, authorizationService)

  return database.sequelize.authenticate()
    .then(() => {
      httpServer.listen(config.http.port)
    })
}

export interface iDefaultEnvs { }
