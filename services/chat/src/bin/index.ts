import { ChatController } from "@/controllers"
import { Database } from "@/database"
import { config, getRequiredDatabaseConfig, Logger, MicroServiceHTTPServer } from "@/libs"
import { ChatService } from "@/services/ChatService"

const logger = new Logger()
const database = new Database(getRequiredDatabaseConfig())
const httpServer = new MicroServiceHTTPServer({ port: config.http.port })
const service = new ChatService(database.models)

httpServer.use([...new ChatController(service).getRoutes()])

start().catch((error) => {
  logger.error("Не удалось запустить chat service", { error })
  process.exit(1)
})

function start(): Promise<void> {
  return database.sequelize.authenticate()
    .then(() => {
      httpServer.listen(config.http.port)
    })
}

export interface iDefaultEnvs { }
