import { ChatController } from "../controllers"
import { Database } from "../database"
import { config, DatabaseServiceTools, FilePreviewProxy, getRequiredDatabaseConfig, Logger, MicroServiceHTTPServer, ProcessCluster } from "@/libs"
import { ChatService } from "../services/ChatService"
import { FileStorageService } from "../services/FileStorageService"

ProcessCluster.run(config.process, startApplication, (error) => {
  const logger = new Logger()
  logger.error("Не удалось запустить chat service", { error: error instanceof Error ? error : String(error) })
})

function startApplication(): Promise<void> {
  const logger = new Logger()
  const database = new Database(getRequiredDatabaseConfig())
  const httpServer = new MicroServiceHTTPServer({ port: config.http.port })
  const databaseTools = new DatabaseServiceTools(database.Sequelize, logger)
  const fileStorageService = new FileStorageService(database.models.StoredFile, new FilePreviewProxy())
  const service = new ChatService(database.models, databaseTools, fileStorageService)

  httpServer.use([...new ChatController(service).getRoutes()])

  return database.sequelize.authenticate()
    .then(() => {
      httpServer.listen(config.http.port)
    })
}

export interface iDefaultEnvs { }
