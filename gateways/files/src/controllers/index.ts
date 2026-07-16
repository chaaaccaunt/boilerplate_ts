import { HTTPController, HTTPServer } from "@/libs"
import { FileEventsGatewayClient } from "@/services/FileEventsGatewayClient"
import { FilesController } from "./FilesController"

export class Controllers {
  private readonly controllers: HTTPController[]

  constructor(
    httpServer: HTTPServer,
    models: iDatabase.Models,
    databaseTools: iLibs.DatabaseServiceTools,
    fileEventsGatewayClient: FileEventsGatewayClient | null = null
  ) {
    this.controllers = [
      new FilesController(models, databaseTools, fileEventsGatewayClient)
    ]

    this.controllers.forEach((controller) => {
      httpServer.use([...controller.getRoutes()])
    })
  }
}
