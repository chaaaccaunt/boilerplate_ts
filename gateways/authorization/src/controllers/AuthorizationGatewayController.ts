import { Exceptions } from "@/libs"
import { InternalServiceClient } from "@/services/InternalServiceClient"
import { BaseController } from "./BaseController"

export class AuthorizationGatewayController extends BaseController {
  constructor(
    private readonly serviceClient: InternalServiceClient,
    private readonly httpConfig: iLibs.iHTTPConfig
  ) {
    super()

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

  private login(payload: iContracts.iRequestContextPayload<iSharedAuthorization.LoginPayloadDto>): Promise<iContracts.iControllerResult<iSharedAuthorization.LoginResponseDto>> {
    if (!payload.data) throw new Exceptions.ControllerError.InternalError("Отсутствуют данные запроса для AuthorizationGatewayController.login")

    return this.serviceClient.request<iAuthorization.iLoginResult, iSharedAuthorization.LoginPayloadDto>({
      requestId: payload.requestId,
      path: "/authorization/login",
      payload: payload.data
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
          }
        ]
      }))
  }

  private logout(payload: iContracts.iRequestContextPayload): Promise<iContracts.iControllerResult<iSharedAuthorization.LogoutResponseDto>> {
    if (!payload.user) throw new Exceptions.ControllerError.AccessDeniedError()

    return Promise.resolve({
      data: { success: true },
      clearCookies: [this.httpConfig.cookie_name]
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
}
