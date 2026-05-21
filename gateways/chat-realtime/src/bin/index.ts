import { config, HTTPServer, WebSocketServer } from "@/libs"
import { SystemPackageEventsController } from "@/controllers"
import { ChatSocketGateway } from "@/realtime"
import { InternalServiceClient } from "@/services/InternalServiceClient"

const httpServer = new HTTPServer(config.http)
const webSocketServer = new WebSocketServer(httpServer.getNativeServer(), config.http)

if (!config.internalServices.chatUrl) {
  throw new Error("Missing VAR_CHAT_SERVICE_URL for chat realtime gateway")
}

if (!config.internalServices.token) {
  throw new Error("Missing VAR_INTERNAL_SERVICE_TOKEN for chat realtime gateway")
}

webSocketServer.use([
  new ChatSocketGateway(new InternalServiceClient(config.internalServices.chatUrl, config.internalServices.token))
])
httpServer.use([
  new SystemPackageEventsController(webSocketServer, config.internalServices.token).getRoutes()
].flat())

httpServer.listen(config.http.port)
webSocketServer.listen()

export interface iDefaultEnvs { }
