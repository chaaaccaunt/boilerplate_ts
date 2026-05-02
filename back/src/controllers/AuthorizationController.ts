import { AuthorizationService } from "@/services/AuthorizationService"
import { Exceptions } from "@/libs"
import { BaseController } from "./BaseController"

interface iLoginPayload {
  data?: iAuthorization.iLoginPayload
}

interface iLogoutPayload {
  user?: iContracts.iUserToken
}

interface iStatePayload {
  user?: iContracts.iUserToken
}

export class AuthorizationController extends BaseController {
  private readonly service: AuthorizationService

  constructor(model: iDatabase.Models["User"], private readonly httpConfig: iLibs.iHTTPConfig) {
    super()
    this.service = new AuthorizationService(model, httpConfig)

    const loginRoute: iContracts.iRoute<iAuthorization.iLoginPayload, iContracts.iControllerResult<iSharedAuthorization.LoginResponseDto>> = {
      url: /^\/authorization\/login\/?$/,
      method: "POST",
      middlewares: ["payloadValidator"],
      validator: {
        login: { isPrimitive: { string: { minLength: 1 } } },
        password: { isPrimitive: { string: { minLength: 1 } } }
      },
      callback: this.handle("login", this.login.bind(this))
    }

    const logoutRoute: iContracts.iRoute<iContracts.iPayload, iContracts.iControllerResult<iSharedAuthorization.LogoutResponseDto>> = {
      url: /^\/authorization\/logout\/?$/,
      method: "POST",
      middlewares: ["httpTokenValidator"],
      callback: this.handle("logout", this.logout.bind(this))
    }

    const stateRoute: iContracts.iRoute<iContracts.iPayload, iContracts.iControllerResult<iSharedAuthorization.AuthorizationStateResponseDto>> = {
      url: /^\/authorization\/state\/?$/,
      method: "GET",
      middlewares: ["httpTokenValidator"],
      clearCookiesOnError: [this.httpConfig.cookie_name],
      callback: this.handle("state", this.state.bind(this))
    }

    this.addRoutes([loginRoute, logoutRoute, stateRoute])
  }

  private async login(payload: iLoginPayload): Promise<iContracts.iControllerResult<iSharedAuthorization.LoginResponseDto>> {
    if (!payload.data) throw new Exceptions.ControllerError.InternalError("Отсутствуют данные запроса для AuthorizationController.login")

    const result = await this.service.login(payload.data)

    return {
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
    }
  }

  private async logout(payload: iLogoutPayload): Promise<iContracts.iControllerResult<iSharedAuthorization.LogoutResponseDto>> {
    if (!payload.user) throw new Exceptions.ControllerError.AccessDeniedError()

    return {
      data: { success: true },
      clearCookies: [this.httpConfig.cookie_name]
    }
  }

  private async state(payload: iStatePayload): Promise<iContracts.iControllerResult<iSharedAuthorization.AuthorizationStateResponseDto>> {
    if (!payload.user) throw new Exceptions.ControllerError.UnauthorizedError()

    return {
      data: {
        authenticated: true
      }
    }
  }
}

