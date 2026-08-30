import { Controllers } from "@/controllers"
import { config, HTTPServer, Logger, ProcessCluster } from "@/libs"

ProcessCluster.run(config.process, startApplication, (error) => {
  const logger = new Logger()
  logger.error("Не удалось запустить public gateway", { error: error instanceof Error ? error : String(error) })
})

function startApplication(): void {
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

export interface iDefaultEnvs { }
