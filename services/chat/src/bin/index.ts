import { ChatController } from "@/controllers"
import { Database } from "@/database"
import { config, DatabaseServiceTools, getRequiredDatabaseConfig, Logger, MicroServiceHTTPServer, ProcessCluster } from "@/libs"
import { ChatService } from "@/services/ChatService"

ProcessCluster.run(config.process, startApplication, (error) => {
  const logger = new Logger()
  logger.error("Не удалось запустить chat service", { error: error instanceof Error ? error : String(error) })
})

function startApplication(): Promise<void> {
  const logger = new Logger()
  const database = new Database(getRequiredDatabaseConfig())
  const httpServer = new MicroServiceHTTPServer({ port: config.http.port })
  const databaseTools = new DatabaseServiceTools(database.Sequelize, logger)
  const service = new ChatService(database.models, databaseTools)

  httpServer.use([...new ChatController(service).getRoutes()])

  return database.sequelize.authenticate()
    .then(() => {
      httpServer.listen(config.http.port)
    })
}

export interface iDefaultEnvs { }
