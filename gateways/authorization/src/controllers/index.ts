import { HTTPController, HTTPServer } from "@/libs"
import { AuthorizationService } from "@/services/AuthorizationService"
import { AuthorizationGatewayController } from "./AuthorizationGatewayController"

export class Controllers {
  private readonly controllers: HTTPController[]

  constructor(httpServer: HTTPServer, authorizationService: AuthorizationService) {
    this.controllers = [
      new AuthorizationGatewayController(authorizationService, httpServer.config)
    ]

    this.controllers.forEach((controller) => {
      httpServer.use([...controller.getRoutes()])
    })
  }
}
