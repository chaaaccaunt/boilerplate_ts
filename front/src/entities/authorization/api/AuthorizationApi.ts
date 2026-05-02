import type { ApiClient } from "@/entities/api/ApiClient"

export class AuthorizationApi {
  constructor(private readonly api: ApiClient) { }

  login(payload: iSharedAuthorization.LoginPayloadDto): Promise<iSharedAuthorization.LoginResponseDto> {
    return this.api.post<iSharedAuthorization.LoginResponseDto, iSharedAuthorization.LoginPayloadDto>({
      path: "/authorization/login",
      payload,
      commit: "authorization/setUser",
      reportError: false
    })
  }

  logout(): Promise<iSharedAuthorization.LogoutResponseDto> {
    return this.api.post<iSharedAuthorization.LogoutResponseDto>({
      path: "/authorization/logout"
    })
  }

  state(): Promise<iSharedAuthorization.AuthorizationStateResponseDto> {
    return this.api.get<iSharedAuthorization.AuthorizationStateResponseDto>({
      path: "/authorization/state",
      reportError: false
    })
  }
}

