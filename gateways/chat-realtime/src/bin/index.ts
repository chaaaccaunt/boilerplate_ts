import { config, MicroServiceHTTPClient, MicroServiceHTTPServer, WebSocketServer } from "@/libs"
import { ChatSocketController, FileEventsController, SystemPackageEventsController } from "../controller"

if (!config.internalServices.chatUrl) {
  throw new Error("Missing VAR_CHAT_SERVICE_URL for chat realtime gateway")
}

const internalEventServer = new MicroServiceHTTPServer({
  port: config.http.port
})
const webSocketServer = new WebSocketServer(internalEventServer.getNativeServer(), config.http)

webSocketServer.use([
  new ChatSocketController(new MicroServiceHTTPClient(config.internalServices.chatUrl))
])
internalEventServer.use([
  new FileEventsController(webSocketServer).getRoutes(),
  new SystemPackageEventsController(webSocketServer).getRoutes()
].flat())

internalEventServer.listen(config.http.port)
webSocketServer.listen()

export interface iDefaultEnvs { }
