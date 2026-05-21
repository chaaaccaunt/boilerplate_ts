declare global {
  namespace iSharedAuthorization {
    interface LoginPayloadDto {
      login: string
      password: string
    }

    type LoginResponseDto = iSharedUser.PublicUserDto

    interface AuthorizationStateResponseDto {
      authenticated: boolean
    }

    interface LogoutResponseDto {
      success: boolean
    }

    interface UserSessionDto {
      uid: string
      userUid: string
      ipAddress: string | null
      userAgent: string
      deviceType: string
      operatingSystem: string
      browser: string
      lastSeenAt: string
      createdAt: string
      isCurrent: boolean
    }

    interface UserSessionsListResponseDto {
      sessions: UserSessionDto[]
    }

    interface RevokeUserSessionPayloadDto {
      sessionUid: string
    }

    interface RevokeUserSessionResponseDto {
      success: boolean
    }

    interface RevokeOtherUserSessionsResponseDto {
      success: boolean
    }
  }
}

export { }

