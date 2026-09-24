import { MicroServiceHTTPClient } from "@/libs"

export class NotificationAuthClient {
  private readonly client: MicroServiceHTTPClient

  constructor(baseUrl: string) { this.client = new MicroServiceHTTPClient(baseUrl) }

  begin(userUid: string, requestId: string): Promise<iSharedNotifications.BeginTwoFactorResponseDto> {
    return this.client.request({ requestId, path: "/notifications/auth/begin", payload: { userUid } })
  }

  verify(payload: iSharedNotifications.VerifyTwoFactorPayloadDto, requestId: string): Promise<iSharedNotifications.VerifyTwoFactorResponseDto> {
    return this.client.request({ requestId, path: "/notifications/auth/verify", payload })
  }
}
