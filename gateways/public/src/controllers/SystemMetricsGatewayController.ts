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

    const itemRoute: iContracts.iRoute<iContracts.iPayload, iContracts.iControllerResult<iSharedSystem.RuntimeMetricsItemResponseDto>> = {
      url: /^\/system\/metrics\/item\/?$/,
      method: "GET",
      requireAuthorization: true,
      validator: {
        packageUid: { isPrimitive: { string: { minLength: 1 } } }
      },
      callback: this.handle("item", this.item.bind(this))
    }

    this.addRoutes([listRoute, itemRoute])
  }

  private list(payload: iContracts.iRequestContextPayload): Promise<iContracts.iControllerResult<iSharedSystem.RuntimeMetricsListResponseDto>> {
    this.accessPermissions(payload, ["system.metrics.read"], ["superadministrator"])

    return this.logCollectorServiceClient.request<iSharedSystem.RuntimeMetricsListResponseDto>({
      requestId: payload.requestId,
      path: "/system/metrics"
      })
      .then((data) => ({ data }))
  }

  private item(payload: iContracts.iRequestContextPayload<iSharedSystem.RuntimeMetricsItemPayloadDto>): Promise<iContracts.iControllerResult<iSharedSystem.RuntimeMetricsItemResponseDto>> {
    this.accessPermissions(payload, ["system.metrics.read"], ["superadministrator"])
    if (!payload.data?.packageUid) throw new Error("Не задан packageUid для запроса метрик package")

    return this.logCollectorServiceClient.request<iSharedSystem.RuntimeMetricsItemResponseDto, iSharedSystem.RuntimeMetricsItemPayloadDto>({
      requestId: payload.requestId,
      path: "/system/metrics/item",
      payload: {
        packageUid: payload.data.packageUid
      }
    })
      .then((data) => ({ data }))
  }
}
