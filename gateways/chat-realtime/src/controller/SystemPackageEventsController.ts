import { Exceptions, Logger, MicroServiceController, WebSocketServer } from "@/libs"

export class SystemPackageEventsController extends MicroServiceController {
  constructor(private readonly webSocketServer: WebSocketServer, private readonly logger: Logger) {
    super()

    const notifyRoute: iContracts.iMicroServiceRoute<iSharedLogs.RuntimePackageConnectionEventDto, { delivered: true }> = {
      url: /^POST:\/system\/package-connection-event\/?$/,
      method: "POST",
      callback: this.handle(this.constructor.name, "notify", this.notify.bind(this)),
      logSuccessfulResult: false
    }

    this.addRoutes([notifyRoute])
  }

  private notify(payload: iContracts.iMicroServiceRequestPayload<iSharedLogs.RuntimePackageConnectionEventDto>): Promise<{ delivered: true }> {
    const event = this.getEventPayload(payload.data)

    this.webSocketServer.broadcast("system:package-connection", event, {
      allowedPermissions: ["system.read"],
      allowedRoles: ["superadministrator"]
    })

    this.logger.log(
      event.level,
      event.event === "connected"
        ? `Package ${event.source} подключился к log collector; событие передано realtime-клиентам`
        : `Package ${event.source} отключился от log collector; событие передано realtime-клиентам`,
      {
        packageUid: event.packageUid,
        source: event.source,
        event: event.event,
        eventTimestamp: event.timestamp,
        serviceName: this.constructor.name,
        serviceMethod: "notify"
      }
    )

    return Promise.resolve({
      delivered: true
    })
  }

  private getEventPayload(payload: iSharedLogs.RuntimePackageConnectionEventDto | undefined): iSharedLogs.RuntimePackageConnectionEventDto {
    if (!payload) throw new Exceptions.ServiceError.ConflictError("Отсутствуют данные события package")
    if (!payload.packageUid || !payload.source || !payload.event || !payload.timestamp || !payload.level || !payload.message) {
      throw new Exceptions.ServiceError.ConflictError("Некорректные данные события package")
    }

    if (payload.event !== "connected" && payload.event !== "disconnected") {
      throw new Exceptions.ServiceError.ConflictError("Некорректный тип события package")
    }

    return payload
  }
}
