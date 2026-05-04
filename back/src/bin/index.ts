import { Controllers } from "@/controllers";
import { Database } from "@/database";
import { seedAuthorizationData } from "@/database/seeds/authorization";
import { config, HTTPServer, Logger, WebSocketServer } from "@/libs";
import { ChatSocketGateway } from "@/realtime";

const logger = new Logger()
const database = new Database(config.db)
const httpServer = new HTTPServer(config.http)
const webSocketServer = new WebSocketServer(httpServer.getNativeServer(), config.http)
new Controllers(httpServer, database.models)
webSocketServer.use([new ChatSocketGateway(database.models)])

start().catch((error) => {
  logger.error("Не удалось запустить сервер", { error })
  process.exit(1)
})

async function start(): Promise<void> {
  await database.sequelize.authenticate()

  if (process.env.NODE_ENV !== "production") {
    await database.sequelize.sync({ force: true })
    await seedAuthorizationData(database.models)
  }

  httpServer.listen(config.http.port)
  webSocketServer.listen()
}

export interface iDefaultEnvs { }
