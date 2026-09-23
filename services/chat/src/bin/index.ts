import { ChatController } from "../controllers"
import { Database } from "../database"
import { ApplicationRunner, config, DatabaseServiceTools, FilePreviewProxy, getRequiredDatabaseConfig, Logger, MicroServiceHTTPServer } from "@/libs"
import { ChatService } from "../services/ChatService"
import { FileStorageService } from "../services/FileStorageService"

class ChatApplication {
  start(): Promise<void> {
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
}

ApplicationRunner.run({
  application: ChatApplication,
  applicationName: "chat service",
  processConfig: config.process
})

export interface iDefaultEnvs { }
