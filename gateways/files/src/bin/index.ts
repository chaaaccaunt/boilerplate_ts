import { Controllers } from "@/controllers"
import { Database } from "@/database"
import { config, getRequiredDatabaseConfig, HTTPServer, Logger } from "@/libs"

const logger = new Logger()
const database = new Database(getRequiredDatabaseConfig())
const httpServer = new HTTPServer(config.http)

new Controllers(httpServer, database.models)

start().catch((error) => {
  logger.error("Не удалось запустить files gateway", { error })
  process.exit(1)
})

function start(): Promise<void> {
  return database.sequelize.authenticate()
    .then(() => {
      httpServer.listen(config.http.port)
    })
}

export interface iDefaultEnvs { }
