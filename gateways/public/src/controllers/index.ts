import { HTTPController, HTTPServer } from "@/libs"
import { InternalServiceClient } from "@/services/InternalServiceClient"
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
    logCollectorServiceUrl: string,
    internalServiceToken: string
  ) {
    this.controllers = [
      new UsersGatewayController(new InternalServiceClient(usersServiceUrl, internalServiceToken)),
      new ChatHTTPGatewayController(new InternalServiceClient(chatServiceUrl, internalServiceToken)),
      new LogsGatewayController(new InternalServiceClient(logCollectorServiceUrl, internalServiceToken)),
      new SystemMetricsGatewayController(new InternalServiceClient(logCollectorServiceUrl, internalServiceToken))
    ]

    this.controllers.forEach((controller) => {
      httpServer.use([...controller.getRoutes()])
    })
  }
}
