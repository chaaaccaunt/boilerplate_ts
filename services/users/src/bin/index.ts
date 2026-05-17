import { Database } from "@/database"
import { UsersController } from "@/controllers"
import { config, getRequiredDatabaseConfig, Logger, MicroServiceHTTPServer } from "@/libs"
import { UsersService } from "@/services/UsersService"

const logger = new Logger()
const database = new Database(getRequiredDatabaseConfig())
if (!config.internalServices.token) {
  throw new Error("Missing VAR_INTERNAL_SERVICE_TOKEN for users service")
}
const httpServer = new MicroServiceHTTPServer({ port: config.http.port, internalServiceToken: config.internalServices.token })
const service = new UsersService(database.models.User, database.models.Role, database.models.UserRole)

httpServer.use([...new UsersController(service).getRoutes()])

start().catch((error) => {
  logger.error("Не удалось запустить users service", { error })
  process.exit(1)
})

function start(): Promise<void> {
  return database.sequelize.authenticate()
    .then(() => {
      httpServer.listen(config.http.port)
    })
}

export interface iDefaultEnvs { }
