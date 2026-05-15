import { Database } from "@/database"
import { config, Logger, MicroServiceHTTPServer } from "@/libs"
import { UsersRoutes } from "@/routes/UsersRoutes"
import { UsersService } from "@/services/UsersService"

const logger = new Logger()
const database = new Database(config.db)
const httpServer = new MicroServiceHTTPServer({ port: config.http.port })
const service = new UsersService(database.models.User, database.models.Role, database.models.UserRole)

httpServer.use([...new UsersRoutes(service).getRoutes()])

start().catch((error) => {
  logger.error("Не удалось запустить users service", { error })
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
