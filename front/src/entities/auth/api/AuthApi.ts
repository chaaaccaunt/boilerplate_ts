import type { ApiClient } from "@/entities/api/ApiClient"

export class AuthApi {
  constructor(private readonly api: ApiClient) { }

  login(payload: iSharedAuth.LoginPayloadDto): Promise<iSharedAuth.LoginResponseDto> {
    return this.api.post<iSharedAuth.LoginResponseDto, iSharedAuth.LoginPayloadDto>({
      path: "/authorization/login",
      payload,
      commit: "auth/setUser",
      reportError: false
    })
  }

  logout(): Promise<iSharedAuth.LogoutResponseDto> {
    return this.api.post<iSharedAuth.LogoutResponseDto>({
      path: "/authorization/logout"
    })
  }
}
