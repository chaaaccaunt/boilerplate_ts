import { HTTPController, HTTPServer } from "@/libs"
import { FileEventsGatewayClient } from "../services/FileEventsGatewayClient"
import { FileStorageService } from "../services/FileStorageService"
import { FileDtoMapper } from "../services/FileDtoMapper"
import { FilesController } from "./FilesController"

export class Controllers {
  private readonly controllers: HTTPController[]

  constructor(
    httpServer: HTTPServer,
    fileStorageService: FileStorageService,
    fileDtoMapper: FileDtoMapper,
    fileEventsGatewayClient: FileEventsGatewayClient | null = null
  ) {
    this.controllers = [
      new FilesController(fileStorageService, fileDtoMapper, fileEventsGatewayClient)
    ]

    this.controllers.forEach((controller) => {
      httpServer.use([...controller.getRoutes()])
    })
  }
}
