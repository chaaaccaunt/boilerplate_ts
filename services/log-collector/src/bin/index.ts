import { LogsController, SystemMetricsController } from "@/controllers"
import { Database } from "@/database"
import { config, DatabaseServiceTools, getRequiredDatabaseConfig, Logger, LogCollectorSocketServer, MicroServiceHTTPServer } from "@/libs"
import { LogCollectorService } from "@/services/LogCollectorService"
import { RuntimePackageEventGatewayClient } from "@/services/RuntimePackageEventGatewayClient"

const logger = Logger.createLocal()
const database = new Database(getRequiredDatabaseConfig())
const httpServer = new MicroServiceHTTPServer({ port: config.http.port }, logger)
const databaseTools = new DatabaseServiceTools(database.Sequelize, logger)
const service = new LogCollectorService(database.models, databaseTools)
const socketPort = process.env.VAR_LOG_COLLECTOR_SOCKET_PORT

if (!socketPort) {
  throw new Error("Не задан VAR_LOG_COLLECTOR_SOCKET_PORT для log collector")
}

const socketPortValue = socketPort
const runtimePackageEventGatewayClient = config.internalServices.chatRealtimeGatewayUrl
  ? new RuntimePackageEventGatewayClient(config.internalServices.chatRealtimeGatewayUrl)
  : null

start().catch((error) => {
  logger.error("Не удалось запустить log collector service", { error })
  process.exit(1)
})

function start(): Promise<void> {
  return database.sequelize.authenticate()
    .then(() => service.listRuntimePackages())
    .then((runtimePackages) => {
      if (!runtimePackages.length) {
        throw new Error("Не найдены разрешенные runtime packages в таблице runtime_packages")
      }

      const socketServer = new LogCollectorSocketServer(socketPortValue, service, runtimePackages, runtimePackageEventGatewayClient, logger)

      httpServer.use([
        ...new LogsController(service).getRoutes(),
        ...new SystemMetricsController(socketServer).getRoutes()
      ])

      httpServer.listen(config.http.port)
      socketServer.listen()
    })
}

export interface iDefaultEnvs {}
