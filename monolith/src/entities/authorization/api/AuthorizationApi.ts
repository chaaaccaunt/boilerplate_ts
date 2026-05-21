import type { ApiClient } from "@/application/api/ApiClient"

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

  listSessions(): Promise<iSharedAuthorization.UserSessionsListResponseDto> {
    return this.api.get<iSharedAuthorization.UserSessionsListResponseDto>({
      path: "/authorization/sessions"
    })
  }

  revokeSession(payload: iSharedAuthorization.RevokeUserSessionPayloadDto): Promise<iSharedAuthorization.RevokeUserSessionResponseDto> {
    return this.api.post<iSharedAuthorization.RevokeUserSessionResponseDto, iSharedAuthorization.RevokeUserSessionPayloadDto>({
      path: "/authorization/sessions/revoke",
      payload
    })
  }

  revokeOtherSessions(): Promise<iSharedAuthorization.RevokeOtherUserSessionsResponseDto> {
    return this.api.post<iSharedAuthorization.RevokeOtherUserSessionsResponseDto>({
      path: "/authorization/sessions/revoke-others"
    })
  }
}

