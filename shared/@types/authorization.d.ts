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
  }
}

export { }

