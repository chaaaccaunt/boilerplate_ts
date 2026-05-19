import { HTTPController, HTTPServer } from "@/libs"
import { FilesController } from "./FilesController"

export class Controllers {
  private readonly controllers: HTTPController[]

  constructor(httpServer: HTTPServer, models: iDatabase.Models, databaseTools: iLibs.DatabaseServiceTools) {
    this.controllers = [
      new FilesController(models, databaseTools)
    ]

    this.controllers.forEach((controller) => {
      httpServer.use([...controller.getRoutes()])
    })
  }
}
