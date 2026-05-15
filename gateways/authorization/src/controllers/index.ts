import { HTTPServer } from "@/libs"
import { InternalServiceClient } from "@/services/InternalServiceClient"
import { AuthorizationGatewayController } from "./AuthorizationGatewayController"
import { BaseController } from "./BaseController"

export class Controllers {
  private readonly controllers: BaseController[]

  constructor(httpServer: HTTPServer, authorizationServiceUrl: string) {
    const authorizationServiceClient = new InternalServiceClient(authorizationServiceUrl)

    this.controllers = [
      new AuthorizationGatewayController(authorizationServiceClient, httpServer.config)
    ]

    this.controllers.forEach((controller) => {
      httpServer.use([...controller.getRoutes()])
    })
  }
}

export { BaseController }
