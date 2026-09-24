import { Controllers } from "../controllers"
import { Database } from "../database"
import { ApplicationRunner, config, DatabaseServiceTools, getRequiredDatabaseConfig, HTTPServer, Logger } from "@/libs"
import { AuthorizationService } from "../services/AuthorizationService"
import { NotificationAuthClient } from "../services/NotificationAuthClient"

class AuthorizationGatewayApplication {
  start(): Promise<void> {
    const logger = new Logger()
    const database = new Database(getRequiredDatabaseConfig())
    const databaseTools = new DatabaseServiceTools(database.Sequelize, logger)
    const httpServer = new HTTPServer(config.http)
    if (!config.internalServices.notificationsUrl) throw new Error("Не задан VAR_NOTIFICATIONS_SERVICE_URL для authorization gateway")
    const authorizationService = new AuthorizationService(database.models.User, database.models.UserSession, databaseTools, config.http, new NotificationAuthClient(config.internalServices.notificationsUrl))

    new Controllers(httpServer, authorizationService)

    return database.sequelize.authenticate()
      .then(() => {
        httpServer.listen(config.http.port)
      })
  }
}

ApplicationRunner.run({
  application: AuthorizationGatewayApplication,
  applicationName: "authorization gateway",
  processConfig: config.process
})

export interface iDefaultEnvs { }
