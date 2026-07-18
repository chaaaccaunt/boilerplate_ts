import { InternalServiceClient } from "@/services/InternalServiceClient"
import { Exceptions, HTTPController } from "@/libs"

export class LogsGatewayController extends HTTPController {
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

  private list(payload: iContracts.iRequestContextPayload<iSharedLogs.LogsListPayloadDto>): Promise<iContracts.iControllerResult<iSharedLogs.LogsListResponseDto>> {
    this.accessPermissions(payload, ["logs.read"], ["superadministrator"])

    return this.logCollectorServiceClient.request<iSharedLogs.LogsListResponseDto, iSharedLogs.LogsListPayloadDto>({
      requestId: payload.requestId,
      path: "/logs/list",
      payload: this.getListPayload(payload.data)
    })
      .then((data) => ({ data }))
  }

  private getListPayload(payload: iSharedLogs.LogsListPayloadDto | undefined): iSharedLogs.LogsListPayloadDto {
    return {
      limit: this.getOptionalNumber(payload?.limit),
      offset: this.getOptionalNumber(payload?.offset),
      level: this.getOptionalLevel(payload?.level),
      kind: this.getOptionalKind(payload?.kind),
      packageUid: this.getOptionalString(payload?.packageUid)
    }
  }

  private getOptionalNumber(value: unknown): number | undefined {
    if (value === undefined || value === null || value === "") return undefined
    const numberValue = typeof value === "number" ? value : Number(value)
    if (!Number.isFinite(numberValue) || numberValue < 0) {
      throw new Exceptions.ControllerError.ConflictError("Некорректный числовой параметр логов")
    }

    return numberValue
  }

  private getOptionalLevel(value: unknown): iSharedLogs.LogLevel | undefined {
    if (value === "debug" || value === "info" || value === "warn" || value === "error") return value
    return undefined
  }

  private getOptionalKind(value: unknown): iSharedLogs.LogKind | undefined {
    if (value === "application" || value === "collector_connection" || value === "collector_disconnection") return value
    return undefined
  }

  private getOptionalString(value: unknown): string | undefined {
    if (typeof value !== "string" || !value.trim()) return undefined
    return value.trim()
  }
}
