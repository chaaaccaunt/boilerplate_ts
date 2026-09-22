import { HTTPController, HTTPServer, MicroServiceHTTPClient } from "@/libs"
import { ChatHTTPGatewayController } from "./ChatHTTPGatewayController"
import { LogsGatewayController } from "./LogsGatewayController"
import { SystemMetricsGatewayController } from "./SystemMetricsGatewayController"
import { UsersGatewayController } from "./UsersGatewayController"

export class Controllers {
  private readonly controllers: HTTPController[]

  constructor(
    httpServer: HTTPServer,
    usersServiceUrl: string,
    chatServiceUrl: string,
    logCollectorServiceUrl: string
  ) {
    this.controllers = [
      new UsersGatewayController(new MicroServiceHTTPClient(usersServiceUrl)),
      new ChatHTTPGatewayController(new MicroServiceHTTPClient(chatServiceUrl)),
      new LogsGatewayController(new MicroServiceHTTPClient(logCollectorServiceUrl)),
      new SystemMetricsGatewayController(new MicroServiceHTTPClient(logCollectorServiceUrl))
    ]

    this.controllers.forEach((controller) => {
      httpServer.use([...controller.getRoutes()])
    })
  }
}
