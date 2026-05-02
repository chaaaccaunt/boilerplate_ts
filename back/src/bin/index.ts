import { Controllers } from "@/controllers";
import { Database } from "@/database";
import { config, HTTPServer, Logger } from "@/libs";

const logger = new Logger()
const database = new Database(config.db)
const httpServer = new HTTPServer(config.http)
new Controllers(httpServer, database.models)

database.sequelize.sync().then(() => {
  httpServer.listen(config.http.port)
}).catch((error) => {
  logger.error("Failed to start the server", { error })
  process.exit(1)
})

export interface iDefaultEnvs { }
