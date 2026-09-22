import { Database } from "../database"
import { UsersController } from "../controllers"
import { config, DatabaseServiceTools, getRequiredDatabaseConfig, Logger, MicroServiceHTTPServer, ProcessCluster } from "@/libs"
import { UsersService } from "../services/UsersService"
import { RoleService } from "../services/RoleService"

ProcessCluster.run(config.process, startApplication, (error) => {
  const logger = new Logger()
  logger.error("Не удалось запустить users service", { error: error instanceof Error ? error : String(error) })
})

function startApplication(): Promise<void> {
  const logger = new Logger()
  const database = new Database(getRequiredDatabaseConfig())
  const httpServer = new MicroServiceHTTPServer({ port: config.http.port })
  const databaseTools = new DatabaseServiceTools(database.Sequelize, logger)
  const service = new UsersService(database.models.User, database.models.Role, database.models.UserRole, databaseTools)
  const roleService = new RoleService(database.models.Role, database.models.Permission, database.models.RolePermission, database.models.UserRole, databaseTools)

  httpServer.use([...new UsersController(service, roleService).getRoutes()])

  return database.sequelize.authenticate()
    .then(() => {
      httpServer.listen(config.http.port)
    })
}

export interface iDefaultEnvs { }
