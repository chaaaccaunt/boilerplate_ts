import { MicroServiceController } from "@/libs"
import { LogCollectorSocketServer } from "@/services/LogCollectorSocketServer"

export class SystemMetricsController extends MicroServiceController {
  constructor(private readonly socketServer: LogCollectorSocketServer) {
    super()

    const listRoute: iContracts.iMicroServiceRoute<iContracts.iPayload, iSharedSystem.RuntimeMetricsListResponseDto> = {
      url: /^POST:\/system\/metrics\/?$/,
      method: "POST",
      callback: this.handle(this.socketServer.constructor.name, "collectRuntimeMetrics", this.list.bind(this))
    }

    this.addRoutes([listRoute])
  }

  private list(): Promise<iSharedSystem.RuntimeMetricsListResponseDto> {
    return this.socketServer.collectRuntimeMetrics()
  }
}

