import { ApplicationRunner, config, Logger, MicroServiceHTTPClient, MicroServiceHTTPServer, WebSocketServer } from "@/libs"
import { ChatSocketController, FileEventsController, NotificationEventsController, SystemPackageEventsController } from "../controller"

class ChatRealtimeGatewayApplication {
  start(): void {
    if (!config.internalServices.chatUrl) {
      throw new Error("Не задан VAR_CHAT_SERVICE_URL для chat realtime gateway")
    }

    const logger = new Logger()
    const internalEventServer = new MicroServiceHTTPServer({
      port: config.http.port
    }, logger)
    const webSocketServer = new WebSocketServer(internalEventServer.getNativeServer(), config.http)

    webSocketServer.use([
      new ChatSocketController(new MicroServiceHTTPClient(config.internalServices.chatUrl))
    ])
    internalEventServer.use([
      new FileEventsController(webSocketServer).getRoutes(),
      new NotificationEventsController(webSocketServer).getRoutes(),
      new SystemPackageEventsController(webSocketServer, logger).getRoutes()
    ].flat())

    internalEventServer.listen(config.http.port)
    webSocketServer.listen()
  }
}

ApplicationRunner.run({
  application: ChatRealtimeGatewayApplication,
  applicationName: "chat realtime gateway"
})

export interface iDefaultEnvs { }
