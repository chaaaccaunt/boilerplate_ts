import { InternalServiceClient } from "@/services/InternalServiceClient"
import { HTTPController } from "@/libs"

export class SystemMetricsGatewayController extends HTTPController {
  constructor(private readonly logCollectorServiceClient: InternalServiceClient) {
    super()

    const listRoute: iContracts.iRoute<iContracts.iPayload, iContracts.iControllerResult<iSharedSystem.RuntimeMetricsListResponseDto>> = {
      url: /^\/system\/metrics\/?$/,
      method: "GET",
      requireAuthorization: true,
      callback: this.handle("list", this.list.bind(this))
    }

    this.addRoutes([listRoute])
  }

  private list(payload: iContracts.iRequestContextPayload): Promise<iContracts.iControllerResult<iSharedSystem.RuntimeMetricsListResponseDto>> {
    this.access(payload, ["administrator"])

    return this.logCollectorServiceClient.request<iSharedSystem.RuntimeMetricsListResponseDto>({
      requestId: payload.requestId,
      path: "/system/metrics"
    })
      .then((data) => ({ data }))
  }
}

