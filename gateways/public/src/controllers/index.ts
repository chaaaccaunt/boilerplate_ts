import { HTTPServer } from "@/libs"
import { InternalServiceClient } from "@/services/InternalServiceClient"
import { BaseController } from "./BaseController"
import { ChatHTTPGatewayController } from "./ChatHTTPGatewayController"
import { UsersGatewayController } from "./UsersGatewayController"

export class Controllers {
  private readonly controllers: BaseController[]

  constructor(httpServer: HTTPServer, usersServiceUrl: string, chatServiceUrl: string) {
    this.controllers = [
      new UsersGatewayController(new InternalServiceClient(usersServiceUrl)),
      new ChatHTTPGatewayController(new InternalServiceClient(chatServiceUrl))
    ]

    this.controllers.forEach((controller) => {
      httpServer.use([...controller.getRoutes()])
    })
  }
}

export { BaseController }
