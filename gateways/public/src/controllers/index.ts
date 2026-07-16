import { HTTPController, HTTPServer } from "@/libs"
import { InternalServiceClient } from "@/services/InternalServiceClient"
import { ChatHTTPGatewayController } from "./ChatHTTPGatewayController"
import { LogsGatewayController } from "./LogsGatewayController"
import { ServiceTokensGatewayController } from "./ServiceTokensGatewayController"
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
      new UsersGatewayController(new InternalServiceClient(usersServiceUrl)),
      new ServiceTokensGatewayController(new InternalServiceClient(usersServiceUrl)),
      new ChatHTTPGatewayController(new InternalServiceClient(chatServiceUrl)),
      new LogsGatewayController(new InternalServiceClient(logCollectorServiceUrl)),
      new SystemMetricsGatewayController(new InternalServiceClient(logCollectorServiceUrl))
    ]

    this.controllers.forEach((controller) => {
      httpServer.use([...controller.getRoutes()])
    })
  }
}
