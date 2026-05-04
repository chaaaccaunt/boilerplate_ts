import { HTTPServer } from "@/libs"
import { BaseController } from "./BaseController"
import { AuthorizationController } from "./AuthorizationController"
import { FilesController } from "./FilesController"

export class Controllers {
  private readonly controllers: BaseController[]

  constructor(httpServer: HTTPServer, models: iDatabase.Models) {
    this.controllers = [
      new AuthorizationController(models.User, httpServer.config),
      new FilesController(models.StoredFile)
    ]

    this.controllers.forEach((controller) => {
      httpServer.use([...controller.getRoutes()])
    })
  }
}

export { BaseController }

