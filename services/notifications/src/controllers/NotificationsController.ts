import { Exceptions, MicroServiceController } from "@/libs"
import { NotificationsService } from "../services/NotificationsService"

export class NotificationsController extends MicroServiceController {
  constructor(private readonly service: NotificationsService) {
    super()
    this.addRoutes([
      this.route("/notifications/list", "list"),
      this.route("/notifications/create", "create"),
      this.route("/notifications/read", "markRead"),
      this.route("/notifications/read-all", "markAllRead"),
      this.route("/notifications/max/status", "maxStatus"),
      this.route("/notifications/max/bot/status", "maxBotStatus"),
      this.route("/notifications/max/bot/configure", "updateMaxBot"),
      this.route("/notifications/max/link-code", "maxLinkCode"),
      this.route("/notifications/max/unlink", "maxUnlink"),
      this.route("/notifications/max/two-factor", "setTwoFactor"),
      this.route("/notifications/auth/begin", "beginTwoFactor"),
      this.route("/notifications/auth/verify", "verifyTwoFactor")
    ])
  }

  private route(path: string, method: ControllerMethod): iContracts.iMicroServiceRoute {
    const callback = (this as unknown as Record<ControllerMethod, (value: iContracts.iMicroServiceRequestPayload) => Promise<unknown>>)[method]
    return {
      url: new RegExp(`^POST:${path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/?$`),
      method: "POST",
      callback: this.handle(this.service.constructor.name, method, (payload) => callback.call(this, payload))
    }
  }

  private data<T>(payload: iContracts.iMicroServiceRequestPayload<T>): T {
    if (!payload.data) throw new Exceptions.ServiceError.ConflictError("Отсутствуют данные запроса")
    return payload.data
  }

  private list(payload: iContracts.iMicroServiceRequestPayload<{ userUid: string; limit?: number; offset?: number }>) {
    const data = this.data(payload)
    return this.service.list(data.userUid, data.limit, data.offset)
  }
  private create(payload: iContracts.iMicroServiceRequestPayload<iSharedNotifications.CreateNotificationPayloadDto>) { return this.service.create(this.data(payload)) }
  private markRead(payload: iContracts.iMicroServiceRequestPayload<{ userUid: string; notificationUid: string }>) { const data = this.data(payload); return this.service.markRead(data.userUid, data.notificationUid) }
  private markAllRead(payload: iContracts.iMicroServiceRequestPayload<{ userUid: string }>) { return this.service.markAllRead(this.data(payload).userUid) }
  private maxStatus(payload: iContracts.iMicroServiceRequestPayload<{ userUid: string }>) { return this.service.getMaxStatus(this.data(payload).userUid) }
  private maxBotStatus() { return this.service.getMaxBotStatus() }
  private updateMaxBot(payload: iContracts.iMicroServiceRequestPayload<iSharedNotifications.ConfigureMaxBotPayloadDto>) { return this.service.updateMaxBot(this.data(payload).token, payload.requestId) }
  private maxLinkCode(payload: iContracts.iMicroServiceRequestPayload<{ userUid: string }>) { return this.service.createMaxLinkCode(this.data(payload).userUid) }
  private maxUnlink(payload: iContracts.iMicroServiceRequestPayload<{ userUid: string }>) { return this.service.unlinkMax(this.data(payload).userUid) }
  private setTwoFactor(payload: iContracts.iMicroServiceRequestPayload<{ userUid: string; enabled: boolean }>) { const data = this.data(payload); return this.service.setTwoFactor(data.userUid, data.enabled) }
  private beginTwoFactor(payload: iContracts.iMicroServiceRequestPayload<iSharedNotifications.BeginTwoFactorPayloadDto>) { return this.service.beginTwoFactor(this.data(payload).userUid) }
  private verifyTwoFactor(payload: iContracts.iMicroServiceRequestPayload<iSharedNotifications.VerifyTwoFactorPayloadDto>) { const data = this.data(payload); return this.service.verifyTwoFactor(data.challengeUid, data.code) }
}

type ControllerMethod = "list" | "create" | "markRead" | "markAllRead" | "maxStatus" | "maxBotStatus" | "updateMaxBot" | "maxLinkCode" | "maxUnlink" | "setTwoFactor" | "beginTwoFactor" | "verifyTwoFactor"
