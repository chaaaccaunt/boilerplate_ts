import { InternalServiceClient } from "@/services/InternalServiceClient"
import { BaseController } from "./BaseController"

export class LogsGatewayController extends BaseController {
  constructor(private readonly logCollectorServiceClient: InternalServiceClient) {
    super()

    const listRoute: iContracts.iRoute<iSharedLogs.LogsListPayloadDto, iContracts.iControllerResult<iSharedLogs.LogsListResponseDto>> = {
      url: /^\/logs\/?$/,
      method: "GET",
      requireAuthorization: true,
      callback: this.handle("list", this.list.bind(this))
    }

    this.addRoutes([listRoute])
  }

  private list(payload: iContracts.iRequestContextPayload): Promise<iContracts.iControllerResult<iSharedLogs.LogsListResponseDto>> {
    this.access(payload, ["administrator"])

    return this.logCollectorServiceClient.request<iSharedLogs.LogsListResponseDto, iSharedLogs.LogsListPayloadDto>({
      requestId: payload.requestId,
      path: "/logs/list",
      payload: {
        limit: 300
      }
    })
      .then((data) => ({ data }))
  }
}
