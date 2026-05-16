import { HTTPServer } from "@/libs"
import { BaseController } from "./BaseController"
import { FilesController } from "./FilesController"

export class Controllers {
  private readonly controllers: BaseController[]

  constructor(httpServer: HTTPServer, models: iDatabase.Models) {
    this.controllers = [
      new FilesController(models)
    ]

    this.controllers.forEach((controller) => {
      httpServer.use([...controller.getRoutes()])
    })
  }
}

export { BaseController }
