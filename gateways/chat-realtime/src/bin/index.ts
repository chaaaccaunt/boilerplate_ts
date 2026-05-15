import { config, HTTPServer, WebSocketServer } from "@/libs"
import { ChatSocketGateway } from "@/realtime"
import { InternalServiceClient } from "@/services/InternalServiceClient"

const httpServer = new HTTPServer(config.http)
const webSocketServer = new WebSocketServer(httpServer.getNativeServer(), config.http)

if (!config.internalServices.chatUrl) {
  throw new Error("Не задан VAR_CHAT_SERVICE_URL для chat realtime gateway")
}

webSocketServer.use([
  new ChatSocketGateway(new InternalServiceClient(config.internalServices.chatUrl))
])

httpServer.listen(config.http.port)
webSocketServer.listen()

export interface iDefaultEnvs { }
