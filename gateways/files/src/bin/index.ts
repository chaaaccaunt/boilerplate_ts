import { Controllers } from "../controllers"
import { Database } from "../database"
import { config, DatabaseServiceTools, FilePreviewProxy, getRequiredDatabaseConfig, HTTPServer, Logger, ProcessCluster } from "@/libs"
import { FileEventsGatewayClient } from "../services/FileEventsGatewayClient"
import { FileStorageService } from "../services/FileStorageService"
import { DocumentExportService } from "../services/DocumentExportService"
import { FileDtoMapper } from "../services/FileDtoMapper"
import { FileAccessPolicy } from "../services/FileAccessPolicy"
import { FileArchiveService } from "../services/FileArchiveService"
import { ZipArchiveWriter } from "../services/ZipArchiveWriter"

ProcessCluster.run(config.process, startApplication, (error) => {
  const logger = new Logger()
  logger.error("Не удалось запустить files gateway", { error: error instanceof Error ? error : String(error) })
})

function startApplication(): Promise<void> {
  const logger = new Logger()
  const database = new Database(getRequiredDatabaseConfig())
  const httpServer = new HTTPServer(config.http)
  const databaseTools = new DatabaseServiceTools(database.Sequelize, logger)
  const previewProxy = new FilePreviewProxy()
  const fileDtoMapper = new FileDtoMapper(previewProxy)
  const fileAccessPolicy = new FileAccessPolicy(database.models.StoredFileFolder)
  const fileArchiveService = new FileArchiveService(database.models.StoredFile, fileAccessPolicy, fileDtoMapper, new ZipArchiveWriter())
  const fileStorageService = new FileStorageService(database.models, databaseTools, previewProxy, logger, new DocumentExportService(), fileDtoMapper, fileAccessPolicy, fileArchiveService)
  const fileEventsGatewayClient = config.internalServices.chatRealtimeGatewayUrl
    ? new FileEventsGatewayClient(config.internalServices.chatRealtimeGatewayUrl)
    : null

  new Controllers(httpServer, fileStorageService, fileDtoMapper, fileEventsGatewayClient)

  return database.sequelize.authenticate()
    .then(() => {
      httpServer.listen(config.http.port)
    })
}

export interface iDefaultEnvs { }
