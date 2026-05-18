import { LogsController, SystemMetricsController } from "@/controllers"
import { Database } from "@/database"
import { config, getRequiredDatabaseConfig, Logger, MicroServiceHTTPServer } from "@/libs"
import { LogCollectorService } from "@/services/LogCollectorService"
import { LogCollectorSocketServer } from "@/services/LogCollectorSocketServer"

const logger = new Logger()
const database = new Database(getRequiredDatabaseConfig())
if (!config.internalServices.token) {
  throw new Error("Missing VAR_INTERNAL_SERVICE_TOKEN for log collector service")
}
const httpServer = new MicroServiceHTTPServer({ port: config.http.port, internalServiceToken: config.internalServices.token })
const service = new LogCollectorService(database.models)
const socketPort = process.env.VAR_LOG_COLLECTOR_SOCKET_PORT

if (!socketPort) {
  throw new Error("Не задан VAR_LOG_COLLECTOR_SOCKET_PORT для log collector")
}

const socketServer = new LogCollectorSocketServer(socketPort, service)

httpServer.use([
  ...new LogsController(service).getRoutes(),
  ...new SystemMetricsController(socketServer).getRoutes()
])

start().catch((error) => {
  logger.error("Не удалось запустить log collector service", { error })
  process.exit(1)
})

function start(): Promise<void> {
  return database.sequelize.authenticate()
    .then(() => {
      httpServer.listen(config.http.port)
      socketServer.listen()
    })
}

export interface iDefaultEnvs {}
