import { AuthorizationService } from "@/services/AuthorizationService"
import { Exceptions } from "@/libs"
import { BaseController } from "./BaseController"

export class AuthorizationController extends BaseController {
  private readonly service: AuthorizationService

  constructor(model: iDatabase.Models["User"], private readonly httpConfig: iLibs.iHTTPConfig) {
    super()
    this.service = new AuthorizationService(model, httpConfig)

    const loginRoute: iContracts.iRoute<iAuthorization.iLoginPayload, iContracts.iControllerResult<iSharedAuthorization.LoginResponseDto>> = {
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
      callback: this.handle("logout", this.logout.bind(this))
    }

    const stateRoute: iContracts.iRoute<iContracts.iPayload, iContracts.iControllerResult<iSharedAuthorization.AuthorizationStateResponseDto>> = {
      url: /^\/authorization\/state\/?$/,
      method: "GET",
      requireAuthorization: true,
      clearCookiesOnError: [this.httpConfig.cookie_name],
      callback: this.handle("state", this.state.bind(this))
    }

    this.addRoutes([loginRoute, logoutRoute, stateRoute])
  }

  private login(payload: iAuthorization.iLoginControllerPayload): Promise<iContracts.iControllerResult<iSharedAuthorization.LoginResponseDto>> {
    if (!payload.data) throw new Exceptions.ControllerError.InternalError("Отсутствуют данные запроса для AuthorizationController.login")

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
          }
        ]
      }))
  }

  private logout(payload: iAuthorization.iLogoutControllerPayload): Promise<iContracts.iControllerResult<iSharedAuthorization.LogoutResponseDto>> {
    if (!payload.user) throw new Exceptions.ControllerError.AccessDeniedError()

    return Promise.resolve({
      data: { success: true },
      clearCookies: [this.httpConfig.cookie_name]
    })
  }

  private state(payload: iAuthorization.iStateControllerPayload): Promise<iContracts.iControllerResult<iSharedAuthorization.AuthorizationStateResponseDto>> {
    if (!payload.user) throw new Exceptions.ControllerError.UnauthorizedError()

    return Promise.resolve({
      data: {
        authenticated: true
      }
    })
  }
}

