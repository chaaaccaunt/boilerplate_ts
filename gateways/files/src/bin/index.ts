import { Controllers } from "@/controllers"
import { Database } from "@/database"
import { config, HTTPServer, Logger } from "@/libs"

const logger = new Logger()
const database = new Database(config.db)
const httpServer = new HTTPServer(config.http)

new Controllers(httpServer, database.models)

start().catch((error) => {
  logger.error("Не удалось запустить files gateway", { error })
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
