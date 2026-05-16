import { Exceptions } from "@/libs"
import { AuthorizationService } from "@/services/AuthorizationService"
import { BaseController } from "./BaseController"

export class AuthorizationGatewayController extends BaseController {
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

    this.addRoutes([loginRoute, logoutRoute, stateRoute])
  }

  private login(payload: iContracts.iRequestContextPayload<iSharedAuthorization.LoginPayloadDto>): Promise<iContracts.iControllerResult<iSharedAuthorization.LoginResponseDto>> {
    if (!payload.data) throw new Exceptions.ControllerError.InternalError("Отсутствуют данные запроса для AuthorizationGatewayController.login")

    return this.service.login(payload.data)
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
              path: "/",
              domain: this.httpConfig.public_user_cookie_domain
            }
          }
        ]
      }))
  }

  private logout(payload: iContracts.iRequestContextPayload): Promise<iContracts.iControllerResult<iSharedAuthorization.LogoutResponseDto>> {
    if (!payload.user) throw new Exceptions.ControllerError.AccessDeniedError()

    return Promise.resolve({
      data: { success: true },
      clearCookies: this.getAuthorizationCookieNames()
    })
  }

  private state(payload: iContracts.iRequestContextPayload): Promise<iContracts.iControllerResult<iSharedAuthorization.AuthorizationStateResponseDto>> {
    if (!payload.user) throw new Exceptions.ControllerError.UnauthorizedError()

    return Promise.resolve({
      data: {
        authenticated: true
      }
    })
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
