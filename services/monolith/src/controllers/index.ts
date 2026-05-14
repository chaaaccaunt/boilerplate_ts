import { HTTPServer, WebSocketServer } from "@/libs"
import { AuthorizationController } from "./AuthorizationController"
import { BaseController } from "./BaseController"
import { FilesController } from "./FilesController"
import { UsersController } from "./UsersController"

export class Controllers {
  private readonly controllers: BaseController[]

  constructor(httpServer: HTTPServer, models: iDatabase.Models, webSocketServer: WebSocketServer) {
    this.controllers = [
      new AuthorizationController(models.User, httpServer.config),
      new FilesController(models.StoredFile),
      new UsersController(models, webSocketServer)
    ]

    this.controllers.forEach((controller) => {
      httpServer.use([...controller.getRoutes()])
    })
  }
}

export { BaseController }
