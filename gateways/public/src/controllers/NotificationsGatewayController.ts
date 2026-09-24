import { Exceptions, HTTPController, MicroServiceHTTPClient } from "@/libs"

export class NotificationsGatewayController extends HTTPController {
  constructor(private readonly client: MicroServiceHTTPClient) {
    super()
    this.addRoutes([
      { url: /^\/notifications(?:\?.*)?$/, method: "GET", requireAuthorization: true, callback: this.handle("list", this.list.bind(this)) },
      { url: /^\/notifications\/read\/?$/, method: "POST", requireAuthorization: true, validator: { notificationUid: { isPrimitive: { string: { minLength: 36, maxLength: 36 } } } }, callback: this.handle("markRead", this.markRead.bind(this)) },
      { url: /^\/notifications\/read-all\/?$/, method: "POST", requireAuthorization: true, callback: this.handle("markAllRead", this.markAllRead.bind(this)) },
      { url: /^\/notifications\/max\/?$/, method: "GET", requireAuthorization: true, callback: this.handle("maxStatus", this.maxStatus.bind(this)) },
      { url: /^\/notifications\/max\/bot\/?$/, method: "GET", requireAuthorization: true, callback: this.handle("maxBotStatus", this.maxBotStatus.bind(this)) },
      { url: /^\/notifications\/max\/bot\/?$/, method: "POST", requireAuthorization: true, validator: { token: { isPrimitive: { string: { minLength: 16, maxLength: 2048 } } } }, callback: this.handle("updateMaxBot", this.updateMaxBot.bind(this)) },
      { url: /^\/notifications\/max\/link-code\/?$/, method: "POST", requireAuthorization: true, callback: this.handle("maxLinkCode", this.maxLinkCode.bind(this)) },
      { url: /^\/notifications\/max\/unlink\/?$/, method: "POST", requireAuthorization: true, callback: this.handle("maxUnlink", this.maxUnlink.bind(this)) },
      { url: /^\/notifications\/max\/two-factor\/?$/, method: "POST", requireAuthorization: true, validator: { enabled: { isPrimitive: { boolean: true } } }, callback: this.handle("setTwoFactor", this.setTwoFactor.bind(this)) }
    ])
  }

  private userUid(payload: iContracts.iRequestContextPayload): string {
    if (!payload.user) throw new Exceptions.ControllerError.UnauthorizedError()
    return payload.user.uid
  }
  private request<TResult, TPayload extends iContracts.iPayload>(payload: iContracts.iRequestContextPayload, path: string, data: TPayload) {
    return this.client.request<TResult, TPayload>({ requestId: payload.requestId, path, payload: data }).then((result) => ({ data: result }))
  }
  private list(payload: iContracts.iRequestContextPayload<iSharedNotifications.ListNotificationsPayloadDto>) {
    return this.request<iSharedNotifications.ListNotificationsResponseDto, { userUid: string; limit: number; offset: number }>(payload, "/notifications/list", { userUid: this.userUid(payload), limit: Number(payload.data?.limit) || 25, offset: Number(payload.data?.offset) || 0 })
  }
  private markRead(payload: iContracts.iRequestContextPayload<iSharedNotifications.NotificationUidPayloadDto>) { if (!payload.data) throw new Exceptions.ControllerError.ConflictError("Не выбрано уведомление"); return this.request(payload, "/notifications/read", { userUid: this.userUid(payload), notificationUid: payload.data.notificationUid }) }
  private markAllRead(payload: iContracts.iRequestContextPayload) { return this.request(payload, "/notifications/read-all", { userUid: this.userUid(payload) }) }
  private maxStatus(payload: iContracts.iRequestContextPayload) { return this.request(payload, "/notifications/max/status", { userUid: this.userUid(payload) }) }
  private maxBotStatus(payload: iContracts.iRequestContextPayload) { this.access(payload, ["superadministrator"]); return this.request(payload, "/notifications/max/bot/status", {}) }
  private updateMaxBot(payload: iContracts.iRequestContextPayload<iSharedNotifications.ConfigureMaxBotPayloadDto>) { this.access(payload, ["superadministrator"]); if (!payload.data) throw new Exceptions.ControllerError.ConflictError("Не задан токен MAX-бота"); return this.request(payload, "/notifications/max/bot/configure", payload.data) }
  private maxLinkCode(payload: iContracts.iRequestContextPayload) { return this.request(payload, "/notifications/max/link-code", { userUid: this.userUid(payload) }) }
  private maxUnlink(payload: iContracts.iRequestContextPayload) { return this.request(payload, "/notifications/max/unlink", { userUid: this.userUid(payload) }) }
  private setTwoFactor(payload: iContracts.iRequestContextPayload<iSharedNotifications.SetTwoFactorPayloadDto>) { if (!payload.data) throw new Exceptions.ControllerError.ConflictError("Не задано состояние 2FA"); return this.request(payload, "/notifications/max/two-factor", { userUid: this.userUid(payload), enabled: payload.data.enabled }) }
}
