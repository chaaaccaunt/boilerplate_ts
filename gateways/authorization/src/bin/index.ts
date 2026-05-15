import { Controllers } from "@/controllers"
import { config, HTTPServer, Logger } from "@/libs"

const logger = new Logger()
const httpServer = new HTTPServer(config.http)

if (!config.internalServices.authorizationUrl) {
  throw new Error("Не задан VAR_AUTHORIZATION_SERVICE_URL для authorization gateway")
}

new Controllers(httpServer, config.internalServices.authorizationUrl)

httpServer.listen(config.http.port)

export interface iDefaultEnvs { }
