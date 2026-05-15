import { Database } from "@/database"
import { seedAuthorizationData } from "@/database/seeds/authorization"
import { config, Logger, MicroServiceHTTPServer } from "@/libs"
import { AuthorizationRoutes } from "@/routes/AuthorizationRoutes"
import { AuthorizationService } from "@/services/AuthorizationService"

const logger = new Logger()
const database = new Database(config.db)
const httpServer = new MicroServiceHTTPServer({ port: config.http.port })
const service = new AuthorizationService(database.models.User, config.http)

httpServer.use([...new AuthorizationRoutes(service).getRoutes()])

start().catch((error) => {
  logger.error("Не удалось запустить authorization service", { error })
  process.exit(1)
})

function start(): Promise<void> {
  return database.sequelize.authenticate()
    .then(() => {
      if (process.env.NODE_ENV === "production") return undefined
      return database.sequelize.sync()
        .then(() => seedAuthorizationData(database.models))
    })
    .then(() => {
      httpServer.listen(config.http.port)
    })
}

export interface iDefaultEnvs { }
