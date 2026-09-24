import { MicroServiceHTTPClient } from "@/libs"

export class RealtimeNotificationClient {
  private readonly client: MicroServiceHTTPClient | null

  constructor(baseUrl?: string) {
    this.client = baseUrl ? new MicroServiceHTTPClient(baseUrl) : null
  }

  notify(event: iSharedNotifications.NotificationRealtimeEventDto): Promise<void> {
    if (!this.client) return Promise.resolve()

    return this.client.request<{ delivered: true }, iSharedNotifications.NotificationRealtimeEventDto>({
      requestId: event.notification.uid,
      path: "/notifications/events",
      payload: event
    }).then(() => undefined)
  }
}
