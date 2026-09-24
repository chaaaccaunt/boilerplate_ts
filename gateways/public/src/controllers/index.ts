import { HTTPController, HTTPServer, MicroServiceHTTPClient } from "@/libs"
import { ChatHTTPGatewayController } from "./ChatHTTPGatewayController"
import { LogsGatewayController } from "./LogsGatewayController"
import { SystemMetricsGatewayController } from "./SystemMetricsGatewayController"
import { UsersGatewayController } from "./UsersGatewayController"
import { NotificationsGatewayController } from "./NotificationsGatewayController"

export class Controllers {
  private readonly controllers: HTTPController[]

  constructor(
    httpServer: HTTPServer,
    usersServiceUrl: string,
    chatServiceUrl: string,
    logCollectorServiceUrl: string,
    notificationsServiceUrl: string
  ) {
    this.controllers = [
      new UsersGatewayController(new MicroServiceHTTPClient(usersServiceUrl), new MicroServiceHTTPClient(notificationsServiceUrl)),
      new ChatHTTPGatewayController(new MicroServiceHTTPClient(chatServiceUrl)),
      new LogsGatewayController(new MicroServiceHTTPClient(logCollectorServiceUrl)),
      new SystemMetricsGatewayController(new MicroServiceHTTPClient(logCollectorServiceUrl)),
      new NotificationsGatewayController(new MicroServiceHTTPClient(notificationsServiceUrl))
    ]

    this.controllers.forEach((controller) => {
      httpServer.use([...controller.getRoutes()])
    })
  }
}
