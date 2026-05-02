declare global {
  namespace iSharedAuth {
    interface LoginPayloadDto {
      login: string
      password: string
    }

    type LoginResponseDto = iSharedUser.PublicUserDto

    interface LogoutResponseDto {
      success: boolean
    }
  }
}

export { }
