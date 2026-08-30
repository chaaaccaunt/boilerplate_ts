import { Controllers } from "@/controllers"
import { Database } from "@/database"
import { config, DatabaseServiceTools, getRequiredDatabaseConfig, HTTPServer, Logger, ProcessCluster } from "@/libs"
import { FileEventsGatewayClient } from "@/services/FileEventsGatewayClient"

ProcessCluster.run(config.process, startApplication, (error) => {
  const logger = new Logger()
  logger.error("Не удалось запустить files gateway", { error: error instanceof Error ? error : String(error) })
})

function startApplication(): Promise<void> {
  const logger = new Logger()
  const database = new Database(getRequiredDatabaseConfig())
  const httpServer = new HTTPServer(config.http)
  const databaseTools = new DatabaseServiceTools(database.Sequelize, logger)
  const fileEventsGatewayClient = config.internalServices.chatRealtimeGatewayUrl
    ? new FileEventsGatewayClient(config.internalServices.chatRealtimeGatewayUrl)
    : null

  new Controllers(httpServer, database.models, databaseTools, fileEventsGatewayClient)

  return database.sequelize.authenticate()
    .then(() => {
      httpServer.listen(config.http.port)
    })
}

export interface iDefaultEnvs { }
