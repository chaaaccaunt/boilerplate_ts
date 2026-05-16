import { HTTPServer } from "@/libs"
import { AuthorizationService } from "@/services/AuthorizationService"
import { AuthorizationGatewayController } from "./AuthorizationGatewayController"
import { BaseController } from "./BaseController"

export class Controllers {
  private readonly controllers: BaseController[]

  constructor(httpServer: HTTPServer, authorizationService: AuthorizationService) {
    this.controllers = [
      new AuthorizationGatewayController(authorizationService, httpServer.config)
    ]

    this.controllers.forEach((controller) => {
      httpServer.use([...controller.getRoutes()])
    })
  }
}

export { BaseController }
