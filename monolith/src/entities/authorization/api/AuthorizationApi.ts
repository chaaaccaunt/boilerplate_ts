import type { ApiRequester } from "@/shared/api"

export class AuthorizationApi {
  constructor(private readonly api: ApiRequester) { }

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

  listSessions(payload: iSharedAuthorization.UserSessionsListPayloadDto = {}): Promise<iSharedAuthorization.UserSessionsListResponseDto> {
    const search = new URLSearchParams()
    if (payload.limit !== undefined) search.set("limit", String(payload.limit))
    if (payload.offset !== undefined) search.set("offset", String(payload.offset))

    return this.api.get<iSharedAuthorization.UserSessionsListResponseDto>({
      path: `/authorization/sessions${search.size ? `?${search.toString()}` : ""}` as `/${string}`
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
