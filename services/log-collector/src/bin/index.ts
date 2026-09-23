import { LogsController, SystemMetricsController } from "../controllers"
import { Database } from "../database"
import { ApplicationRunner, config, DatabaseServiceTools, getRequiredDatabaseConfig, Logger, LogCollectorConnectionRegistry, LogCollectorProtocol, LogCollectorSocketServer, MicroServiceHTTPServer, RuntimeMetrics } from "@/libs"
import { LogCollectorService } from "../services/LogCollectorService"
import { RuntimePackageEventGatewayClient } from "../services/RuntimePackageEventGatewayClient"

class LogCollectorApplication {
  private readonly logger = Logger.createLocal()

  start(): Promise<void> {
    const database = new Database(getRequiredDatabaseConfig())
    const httpServer = new MicroServiceHTTPServer({ port: config.http.port }, this.logger)
    const databaseTools = new DatabaseServiceTools(database.Sequelize, this.logger)
    const service = new LogCollectorService(database.models, databaseTools)
    const socketPort = process.env.VAR_LOG_COLLECTOR_SOCKET_PORT

    if (!socketPort) {
      throw new Error("Не задан VAR_LOG_COLLECTOR_SOCKET_PORT для log collector")
    }

    const runtimePackageEventGatewayClient = config.internalServices.chatRealtimeGatewayUrl
      ? new RuntimePackageEventGatewayClient(config.internalServices.chatRealtimeGatewayUrl)
      : null

    return database.sequelize.authenticate()
      .then(() => service.listRuntimePackages())
      .then((runtimePackages) => {
        if (!runtimePackages.length) {
          throw new Error("Не найдены разрешенные runtime packages в таблице runtime_packages")
        }

        const socketServer = new LogCollectorSocketServer(
          socketPort,
          service,
          runtimePackages,
          runtimePackageEventGatewayClient,
          this.logger,
          new LogCollectorConnectionRegistry(),
          new LogCollectorProtocol(),
          new RuntimeMetrics()
        )

        httpServer.use([
          ...new LogsController(service).getRoutes(),
          ...new SystemMetricsController(socketServer).getRoutes()
        ])

        httpServer.listen(config.http.port)
        socketServer.listen()
      })
  }
}

ApplicationRunner.run({
  application: LogCollectorApplication,
  applicationName: "log collector service",
  createLogger: () => Logger.createLocal()
})

export interface iDefaultEnvs {}
