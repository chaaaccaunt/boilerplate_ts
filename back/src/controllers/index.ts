import { HTTPServer } from "@/libs"
import { BaseController } from "./BaseController"
import { AuthorizationController } from "./AuthorizationController"

export class Controllers {
  private readonly controllers: BaseController[]

  constructor(httpServer: HTTPServer, models: iDatabase.Models) {
    this.controllers = [
      new AuthorizationController(models.User, httpServer.config),
    ]

    this.controllers.forEach((controller) => {
      httpServer.use([...controller.getRoutes()])
    })
  }
}

export { BaseController }

