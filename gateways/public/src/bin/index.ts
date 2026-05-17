import { Controllers } from "@/controllers"
import { config, HTTPServer } from "@/libs"

const httpServer = new HTTPServer(config.http)

if (!config.internalServices.usersUrl) {
  throw new Error("Не задан VAR_USERS_SERVICE_URL для public gateway")
}

if (!config.internalServices.chatUrl) {
  throw new Error("Не задан VAR_CHAT_SERVICE_URL для public gateway")
}

if (!config.internalServices.token) {
  throw new Error("Missing VAR_INTERNAL_SERVICE_TOKEN for public gateway")
}

new Controllers(httpServer, config.internalServices.usersUrl, config.internalServices.chatUrl, config.internalServices.token)

httpServer.listen(config.http.port)

export interface iDefaultEnvs { }
