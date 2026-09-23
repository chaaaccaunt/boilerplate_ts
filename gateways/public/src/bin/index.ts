import { Controllers } from "../controllers"
import { ApplicationRunner, config, HTTPServer } from "@/libs"

class PublicGatewayApplication {
  start(): void {
    const httpServer = new HTTPServer(config.http)

    if (!config.internalServices.usersUrl) {
      throw new Error("Не задан VAR_USERS_SERVICE_URL для public gateway")
    }

    if (!config.internalServices.chatUrl) {
      throw new Error("Не задан VAR_CHAT_SERVICE_URL для public gateway")
    }

    if (!config.internalServices.logCollectorUrl) {
      throw new Error("Не задан VAR_LOG_COLLECTOR_SERVICE_URL для public gateway")
    }

    new Controllers(
      httpServer,
      config.internalServices.usersUrl,
      config.internalServices.chatUrl,
      config.internalServices.logCollectorUrl
    )

    httpServer.listen(config.http.port)
  }
}

ApplicationRunner.run({
  application: PublicGatewayApplication,
  applicationName: "public gateway",
  processConfig: config.process
})

export interface iDefaultEnvs { }
