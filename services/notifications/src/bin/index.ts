import { ApplicationRunner, config, DatabaseServiceTools, getRequiredDatabaseConfig, Logger, MicroServiceHTTPServer } from "@/libs"
import { NotificationsController } from "../controllers"
import { Database } from "../database"
import { NotificationsService } from "../services/NotificationsService"
import { RealtimeNotificationClient } from "../services/RealtimeNotificationClient"

class NotificationsApplication {
  start(): Promise<void> {
    const logger = new Logger()
    const database = new Database(getRequiredDatabaseConfig())
    const httpServer = new MicroServiceHTTPServer({ port: config.http.port })
    const service = new NotificationsService(
      database.models.Notification,
      database.models.MaxAccount,
      database.models.MaxBotConfiguration,
      database.models.NotificationChallenge,
      new RealtimeNotificationClient(config.internalServices.chatRealtimeGatewayUrl),
      new DatabaseServiceTools(database.Sequelize, logger),
      process.env.VAR_MAX_BOT_API_URL || "https://platform-api2.max.ru/",
      logger
    )
    httpServer.use([...new NotificationsController(service).getRoutes()])

    return database.sequelize.authenticate()
      .then(() => service.start())
      .then(() => {
        httpServer.listen(config.http.port)
      })
  }
}

ApplicationRunner.run({ application: NotificationsApplication, applicationName: "notifications service", processConfig: config.process })

export interface iDefaultEnvs {
  VAR_MAX_BOT_API_URL?: string
}
