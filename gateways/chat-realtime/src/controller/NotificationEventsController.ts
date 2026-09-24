import type { UUID } from "crypto"
import { Exceptions, MicroServiceController, WebSocketServer } from "@/libs"

export class NotificationEventsController extends MicroServiceController {
  constructor(private readonly webSocketServer: WebSocketServer) {
    super()
    const route: iContracts.iMicroServiceRoute<iSharedNotifications.NotificationRealtimeEventDto, { delivered: true }> = {
      url: /^POST:\/notifications\/events\/?$/,
      method: "POST",
      callback: this.handle(this.constructor.name, "notify", this.notify.bind(this))
    }
    this.addRoutes([route])
  }

  private notify(payload: iContracts.iMicroServiceRequestPayload<iSharedNotifications.NotificationRealtimeEventDto>): Promise<{ delivered: true }> {
    if (!payload.data?.userUid || !payload.data.notification) {
      throw new Exceptions.ServiceError.ConflictError("Некорректное событие уведомления")
    }
    this.webSocketServer.broadcast("notification:created", payload.data.notification, { allowedUserUids: [payload.data.userUid as UUID] })
    return Promise.resolve({ delivered: true })
  }
}
