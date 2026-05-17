import { HTTPServer } from "@/libs"
import { InternalServiceClient } from "@/services/InternalServiceClient"
import { BaseController } from "./BaseController"
import { ChatHTTPGatewayController } from "./ChatHTTPGatewayController"
import { LogsGatewayController } from "./LogsGatewayController"
import { UsersGatewayController } from "./UsersGatewayController"

export class Controllers {
  private readonly controllers: BaseController[]

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
      new LogsGatewayController(new InternalServiceClient(logCollectorServiceUrl))
    ]

    this.controllers.forEach((controller) => {
      httpServer.use([...controller.getRoutes()])
    })
  }
}

export { BaseController }
