import { AuthService } from "@/services/AuthService"
import { iHTTPConfig } from "@/libs/HTTPServer"
import { Exceptions } from "@/libs/Exceptions"
import { BaseController } from "./BaseController"

interface iLoginPayload {
  data?: iAuth.iLoginPayload
}

interface iLogoutPayload {
  user?: iContracts.iUserToken
}

export class AuthController extends BaseController {
  private readonly service: AuthService

  constructor(model: iDatabase.Models["User"], private readonly httpConfig: iHTTPConfig) {
    super()
    this.service = new AuthService(model, httpConfig)

    const loginRoute: iContracts.iRoute<iAuth.iLoginPayload, iContracts.iControllerResult<iAuth.iPublicUser>> = {
      url: /^\/authorization\/login\/?$/,
      method: "POST",
      middlewares: ["payloadValidator"],
      validator: {
        login: { isPrimitive: { string: { minLength: 1 } } },
        password: { isPrimitive: { string: { minLength: 1 } } }
      },
      callback: this.handle("login", this.login.bind(this))
    }

    const logoutRoute: iContracts.iRoute<iContracts.iPayload, iContracts.iControllerResult<{ success: boolean }>> = {
      url: /^\/authorization\/logout\/?$/,
      method: "POST",
      middlewares: ["httpTokenValidator"],
      callback: this.handle("logout", this.logout.bind(this))
    }

    this.addRoutes([loginRoute, logoutRoute])
  }

  private async login(payload: iLoginPayload): Promise<iContracts.iControllerResult<iAuth.iPublicUser>> {
    if (!payload.data) throw new Exceptions.ControllerError.InternalError("AuthController.login payload is missing")

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

  private async logout(payload: iLogoutPayload): Promise<iContracts.iControllerResult<{ success: boolean }>> {
    if (!payload.user) throw new Exceptions.ControllerError.AccessDeniedError()

    await this.service.logout()

    return {
      data: { success: true },
      clearCookies: [this.httpConfig.cookie_name]
    }
  }
}
