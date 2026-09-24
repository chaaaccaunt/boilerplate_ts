import type { ApiRequester } from "@/shared/api"

export class NotificationsApi {
  constructor(private readonly api: ApiRequester) { }

  list(limit = 25, offset = 0): Promise<iSharedNotifications.ListNotificationsResponseDto> { return this.api.get({ path: `/notifications?limit=${limit}&offset=${offset}` }) }
  markRead(notificationUid: string): Promise<iSharedNotifications.NotificationMutationResponseDto> { return this.api.post({ path: "/notifications/read", payload: { notificationUid } }) }
  markAllRead(): Promise<iSharedNotifications.NotificationMutationResponseDto> { return this.api.post({ path: "/notifications/read-all" }) }
  maxStatus(): Promise<iSharedNotifications.MaxAccountStatusDto> { return this.api.get({ path: "/notifications/max" }) }
  maxBotStatus(): Promise<iSharedNotifications.MaxBotStatusDto> { return this.api.get({ path: "/notifications/max/bot" }) }
  configureMaxBot(token: string): Promise<iSharedNotifications.MaxBotStatusDto> { return this.api.post({ path: "/notifications/max/bot", payload: { token } }) }
  createMaxLinkCode(): Promise<iSharedNotifications.MaxLinkCodeResponseDto> { return this.api.post({ path: "/notifications/max/link-code" }) }
  unlinkMax(): Promise<iSharedNotifications.NotificationMutationResponseDto> { return this.api.post({ path: "/notifications/max/unlink" }) }
  setTwoFactor(enabled: boolean): Promise<iSharedNotifications.MaxAccountStatusDto> { return this.api.post({ path: "/notifications/max/two-factor", payload: { enabled } }) }
}
