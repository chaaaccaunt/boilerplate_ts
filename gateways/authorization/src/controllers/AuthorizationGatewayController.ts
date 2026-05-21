import { Exceptions } from "@/libs"
import { AuthorizationService } from "@/services/AuthorizationService"
import { HTTPController } from "@/libs"

export class AuthorizationGatewayController extends HTTPController {
  private readonly publicUserCookieName: string

  constructor(
    private readonly service: AuthorizationService,
    private readonly httpConfig: iLibs.iHTTPConfig
  ) {
    super()
    this.publicUserCookieName = this.getRequiredPublicUserCookieName()

    const loginRoute: iContracts.iRoute<iSharedAuthorization.LoginPayloadDto, iContracts.iControllerResult<iSharedAuthorization.LoginResponseDto>> = {
      url: /^\/authorization\/login\/?$/,
      method: "POST",
      validator: {
        login: { isPrimitive: { string: { minLength: 1 } } },
        password: { isPrimitive: { string: { minLength: 1 } } }
      },
      callback: this.handle("login", this.login.bind(this))
    }

    const logoutRoute: iContracts.iRoute<iContracts.iPayload, iContracts.iControllerResult<iSharedAuthorization.LogoutResponseDto>> = {
      url: /^\/authorization\/logout\/?$/,
      method: "POST",
      requireAuthorization: true,
      clearCookiesOnError: this.getAuthorizationCookieNames(),
      callback: this.handle("logout", this.logout.bind(this))
    }

    const stateRoute: iContracts.iRoute<iContracts.iPayload, iContracts.iControllerResult<iSharedAuthorization.AuthorizationStateResponseDto>> = {
      url: /^\/authorization\/state\/?$/,
      method: "GET",
      requireAuthorization: true,
      clearCookiesOnError: this.getAuthorizationCookieNames(),
      callback: this.handle("state", this.state.bind(this))
    }

    const sessionsRoute: iContracts.iRoute<iContracts.iPayload, iContracts.iControllerResult<iSharedAuthorization.UserSessionsListResponseDto>> = {
      url: /^\/authorization\/sessions\/?$/,
      method: "GET",
      requireAuthorization: true,
      clearCookiesOnError: this.getAuthorizationCookieNames(),
      callback: this.handle("sessions", this.sessions.bind(this))
    }

    const revokeSessionRoute: iContracts.iRoute<iSharedAuthorization.RevokeUserSessionPayloadDto, iContracts.iControllerResult<iSharedAuthorization.RevokeUserSessionResponseDto>> = {
      url: /^\/authorization\/sessions\/revoke\/?$/,
      method: "POST",
      requireAuthorization: true,
      clearCookiesOnError: this.getAuthorizationCookieNames(),
      validator: {
        sessionUid: { isPrimitive: { string: { minLength: 1 } } }
      },
      callback: this.handle("revokeSession", this.revokeSession.bind(this))
    }

    const revokeOtherSessionsRoute: iContracts.iRoute<iContracts.iPayload, iContracts.iControllerResult<iSharedAuthorization.RevokeOtherUserSessionsResponseDto>> = {
      url: /^\/authorization\/sessions\/revoke-others\/?$/,
      method: "POST",
      requireAuthorization: true,
      clearCookiesOnError: this.getAuthorizationCookieNames(),
      callback: this.handle("revokeOtherSessions", this.revokeOtherSessions.bind(this))
    }

    this.addRoutes([loginRoute, logoutRoute, stateRoute, sessionsRoute, revokeSessionRoute, revokeOtherSessionsRoute])
  }

  private login(payload: iContracts.iRequestContextPayload<iSharedAuthorization.LoginPayloadDto>): Promise<iContracts.iControllerResult<iSharedAuthorization.LoginResponseDto>> {
    if (!payload.data) throw new Exceptions.ControllerError.InternalError("Отсутствуют данные запроса для AuthorizationGatewayController.login")

    return this.service.login(payload.data, {
      headers: payload.headers,
      remoteAddress: payload.remoteAddress,
      requestId: payload.requestId
    })
      .then((result) => ({
        data: result.user,
        setCookies: [
          {
            name: this.httpConfig.cookie_name,
            value: result.accessToken,
            options: {
              httpOnly: true,
              secure: process.env.NODE_ENV === "production",
              sameSite: "strict",
              path: "/"
            }
          },
          {
            name: this.publicUserCookieName,
            value: JSON.stringify(result.user),
            options: {
              secure: process.env.NODE_ENV === "production",
              sameSite: "strict",
              path: "/"
            }
          }
        ]
      }))
  }

  private logout(payload: iContracts.iRequestContextPayload): Promise<iContracts.iControllerResult<iSharedAuthorization.LogoutResponseDto>> {
    if (!payload.user) throw new Exceptions.ControllerError.AccessDeniedError()

    return this.service.revokeSession(payload.user, payload.user.sessionUid || "")
      .then((result) => ({
        data: result,
        clearCookies: this.getAuthorizationCookieNames()
      }))
  }

  private state(payload: iContracts.iRequestContextPayload): Promise<iContracts.iControllerResult<iSharedAuthorization.AuthorizationStateResponseDto>> {
    if (!payload.user) throw new Exceptions.ControllerError.UnauthorizedError()

    return this.service.touchSession(payload.user)
      .then(() => ({
        data: {
          authenticated: true
        }
      }))
  }

  private sessions(payload: iContracts.iRequestContextPayload): Promise<iContracts.iControllerResult<iSharedAuthorization.UserSessionsListResponseDto>> {
    if (!payload.user) throw new Exceptions.ControllerError.UnauthorizedError()

    return this.service.listSessions(payload.user)
      .then((result) => ({ data: result }))
  }

  private revokeSession(payload: iContracts.iRequestContextPayload<iSharedAuthorization.RevokeUserSessionPayloadDto>): Promise<iContracts.iControllerResult<iSharedAuthorization.RevokeUserSessionResponseDto>> {
    if (!payload.user) throw new Exceptions.ControllerError.UnauthorizedError()
    if (!payload.data) throw new Exceptions.ControllerError.InternalError("Отсутствуют данные запроса для AuthorizationGatewayController.revokeSession")

    return this.service.revokeSession(payload.user, payload.data.sessionUid)
      .then((result) => ({
        data: result,
        clearCookies: payload.data?.sessionUid === payload.user?.sessionUid ? this.getAuthorizationCookieNames() : undefined
      }))
  }

  private revokeOtherSessions(payload: iContracts.iRequestContextPayload): Promise<iContracts.iControllerResult<iSharedAuthorization.RevokeOtherUserSessionsResponseDto>> {
    if (!payload.user) throw new Exceptions.ControllerError.UnauthorizedError()

    return this.service.revokeOtherSessions(payload.user)
      .then((result) => ({ data: result }))
  }

  private getAuthorizationCookieNames(): string[] {
    return [this.httpConfig.cookie_name, this.publicUserCookieName]
  }

  private getRequiredPublicUserCookieName(): string {
    const cookieName = this.httpConfig.public_user_cookie_name

    if (!cookieName) {
      throw new Error("Не задана обязательная переменная окружения VAR_HTTP_PUBLIC_USER_COOKIE_NAME")
    }

    return cookieName
  }
}
