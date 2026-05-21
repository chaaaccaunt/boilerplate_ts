import { LogCollectorSocketServer, MicroServiceController } from "@/libs"

export class SystemMetricsController extends MicroServiceController {
  constructor(private readonly socketServer: LogCollectorSocketServer) {
    super()

    const listRoute: iContracts.iMicroServiceRoute<iContracts.iPayload, iSharedSystem.RuntimeMetricsListResponseDto> = {
      url: /^POST:\/system\/metrics\/?$/,
      method: "POST",
      callback: this.handle(this.socketServer.constructor.name, "collectRuntimeMetrics", this.list.bind(this))
    }

    const itemRoute: iContracts.iMicroServiceRoute<iSharedSystem.RuntimeMetricsItemPayloadDto, iSharedSystem.RuntimeMetricsItemResponseDto> = {
      url: /^POST:\/system\/metrics\/item\/?$/,
      method: "POST",
      callback: this.handle(this.socketServer.constructor.name, "collectRuntimeMetric", this.item.bind(this))
    }

    this.addRoutes([listRoute, itemRoute])
  }

  private list(): Promise<iSharedSystem.RuntimeMetricsListResponseDto> {
    return this.socketServer.collectRuntimeMetrics()
  }

  private item(payload: iContracts.iMicroServiceRequestPayload<iSharedSystem.RuntimeMetricsItemPayloadDto>): Promise<iSharedSystem.RuntimeMetricsItemResponseDto> {
    if (!payload.data?.packageUid) throw new Error("Не задан packageUid для запроса метрик package")

    return this.socketServer.collectRuntimeMetric(payload.data.packageUid)
  }
}

