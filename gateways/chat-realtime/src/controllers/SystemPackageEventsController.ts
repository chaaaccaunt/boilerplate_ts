import { Exceptions, HTTPController, WebSocketServer } from "@/libs"

export class SystemPackageEventsController extends HTTPController {
  constructor(
    private readonly webSocketServer: WebSocketServer,
    private readonly internalServiceToken: string
  ) {
    super()

    const notifyRoute: iContracts.iRoute<iSharedLogs.RuntimePackageConnectionEventDto, iContracts.iControllerResult<{ delivered: true }>> = {
      url: /^\/system\/package-connection-event\/?$/,
      method: "POST",
      callback: this.handle("notify", this.notify.bind(this))
    }

    this.addRoutes([notifyRoute])
  }

  private notify(payload: iContracts.iRequestContextPayload<iSharedLogs.RuntimePackageConnectionEventDto>): Promise<iContracts.iControllerResult<{ delivered: true }>> {
    this.assertInternalServiceToken(payload)
    const event = this.getEventPayload(payload.data)

    this.webSocketServer.broadcast("system:package-connection", event, {
      allowedRoles: ["administrator"]
    })

    return Promise.resolve({
      data: {
        delivered: true
      }
    })
  }

  private assertInternalServiceToken(payload: iContracts.iRequestContextPayload): void {
    const token = payload.headers["x-internal-service-token"]

    if (typeof token === "string" && token === this.internalServiceToken) return

    throw new Exceptions.ControllerError.UnauthorizedError("Invalid internal service token")
  }

  private getEventPayload(payload: iSharedLogs.RuntimePackageConnectionEventDto | undefined): iSharedLogs.RuntimePackageConnectionEventDto {
    if (!payload) throw new Exceptions.ControllerError.ConflictError("Отсутствуют данные события package")
    if (!payload.packageUid || !payload.source || !payload.event || !payload.timestamp || !payload.level || !payload.message) {
      throw new Exceptions.ControllerError.ConflictError("Некорректные данные события package")
    }

    if (payload.event !== "connected" && payload.event !== "disconnected") {
      throw new Exceptions.ControllerError.ConflictError("Некорректный тип события package")
    }

    return payload
  }
}
