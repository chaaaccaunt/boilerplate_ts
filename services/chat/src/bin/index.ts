import { Database } from "@/database"
import { config, Logger, MicroServiceHTTPServer } from "@/libs"
import { ChatRoutes } from "@/routes/ChatRoutes"
import { ChatService } from "@/services/ChatService"

const logger = new Logger()
const database = new Database(config.db)
const httpServer = new MicroServiceHTTPServer({ port: config.http.port })
const service = new ChatService(database.models)

httpServer.use([...new ChatRoutes(service).getRoutes()])

start().catch((error) => {
  logger.error("Не удалось запустить chat service", { error })
  process.exit(1)
})

function start(): Promise<void> {
  return database.sequelize.authenticate()
    .then(() => {
      if (process.env.NODE_ENV === "production") return undefined
      return database.sequelize.sync()
    })
    .then(() => {
      httpServer.listen(config.http.port)
    })
}

export interface iDefaultEnvs { }
