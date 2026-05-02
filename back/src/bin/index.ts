import { Controllers } from "@/controllers";
import { Database } from "@/database";
import { seedAuthorizationData } from "@/database/seeds/authorization";
import { config, HTTPServer, Logger } from "@/libs";

const logger = new Logger()
const database = new Database(config.db)
const httpServer = new HTTPServer(config.http)
new Controllers(httpServer, database.models)

start().catch((error) => {
  logger.error("Не удалось запустить сервер", { error })
  process.exit(1)
})

async function start(): Promise<void> {
  await database.sequelize.authenticate()

  if (process.env.NODE_ENV !== "production") {
    await database.sequelize.sync()
    await seedAuthorizationData(database.models)
  }

  httpServer.listen(config.http.port)
}

export interface iDefaultEnvs { }
