declare global {
  namespace iSharedNotifications {
    type NotificationKind = "info" | "security" | "permissions"

    interface NotificationDto {
      uid: string
      kind: NotificationKind
      title: string
      message: string
      link: string | null
      readAt: string | null
      createdAt: string
    }

    type ListNotificationsPayloadDto = iSharedApi.PaginationPayloadDto

    interface ListNotificationsResponseDto extends iSharedApi.PaginationDto {
      notifications: NotificationDto[]
      unreadCount: number
    }

    interface NotificationUidPayloadDto { notificationUid: string }
    interface NotificationMutationResponseDto { success: boolean }

    interface CreateNotificationPayloadDto {
      userUid: string
      kind: NotificationKind
      title: string
      message: string
      link?: string | null
    }

    interface MaxAccountStatusDto {
      linked: boolean
      twoFactorEnabled: boolean
      maxDisplayName: string | null
      botAvailable: boolean
    }

    interface MaxLinkCodeResponseDto {
      expiresAt: string
      link: string
    }

    interface MaxBotStatusDto {
      configured: boolean
      running: boolean
      botUsername: string | null
      updatedAt: string | null
    }

    interface ConfigureMaxBotPayloadDto { token: string }

    interface SetTwoFactorPayloadDto { enabled: boolean }

    interface BeginTwoFactorPayloadDto { userUid: string }
    interface BeginTwoFactorResponseDto {
      required: boolean
      challengeUid?: string
      expiresAt?: string
    }

    interface VerifyTwoFactorPayloadDto { challengeUid: string; code: string }
    interface VerifyTwoFactorResponseDto { userUid: string }

    interface NotificationRealtimeEventDto {
      userUid: string
      notification: NotificationDto
    }
  }
}

export { }
