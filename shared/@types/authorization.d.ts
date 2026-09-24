declare global {
  namespace iSharedAuthorization {
    interface LoginPayloadDto {
      login: string
      password: string
    }

    interface TwoFactorRequiredResponseDto {
      status: "two_factor_required"
      challengeUid: string
      expiresAt: string
    }

    type LoginResponseDto = iSharedUser.PublicUserDto | TwoFactorRequiredResponseDto

    interface VerifyTwoFactorLoginPayloadDto {
      challengeUid: string
      code: string
    }

    interface PublicUserCookieRoleDto {
      uid: string
      name: iSharedUserRole.UserRoleName
    }

    interface PublicUserCookieDto {
      uid: string
      login: string
      firstName: string
      lastName: string
      surname: string | null
      fullName: string
      roles: PublicUserCookieRoleDto[]
      permissionKeys: iSharedPermission.PermissionKey[]
    }

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

    type UserSessionsListPayloadDto = iSharedApi.PaginationPayloadDto

    interface UserSessionsListResponseDto extends iSharedApi.PaginationDto {
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
