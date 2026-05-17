import { LogsController } from "@/controllers"
import { Database } from "@/database"
import { config, getRequiredDatabaseConfig, HTTPServer, Logger } from "@/libs"
import { LogCollectorService } from "@/services/LogCollectorService"
import { LogCollectorSocketServer } from "@/services/LogCollectorSocketServer"

const logger = new Logger()
const database = new Database(getRequiredDatabaseConfig())
const httpServer = new HTTPServer(config.http)
const service = new LogCollectorService(database.models)
const socketPort = process.env.VAR_LOG_COLLECTOR_SOCKET_PORT

if (!socketPort) {
  throw new Error("Не задан VAR_LOG_COLLECTOR_SOCKET_PORT для log collector")
}

const socketServer = new LogCollectorSocketServer(socketPort, service)

httpServer.use([...new LogsController(service).getRoutes()])

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
