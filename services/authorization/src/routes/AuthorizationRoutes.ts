import { AuthorizationService } from "@/services/AuthorizationService"

export class AuthorizationRoutes {
  private readonly routes: iContracts.iMicroServiceRoute[]

  constructor(private readonly service: AuthorizationService) {
    const loginRoute: iContracts.iMicroServiceRoute<iSharedAuthorization.LoginPayloadDto, iAuthorization.iLoginResult> = {
      url: /^\/authorization\/login\/?$/,
      method: "POST",
      callback: this.handle("login", this.login.bind(this))
    }

    this.routes = [loginRoute]
  }

  getRoutes(): readonly iContracts.iMicroServiceRoute[] {
    return this.routes
  }

  private login(payload: iContracts.iMicroServiceRequestPayload<iSharedAuthorization.LoginPayloadDto>): Promise<iAuthorization.iLoginResult> {
    if (!payload.data) {
      return Promise.reject(new Error("Отсутствуют данные запроса для AuthorizationService.login"))
    }

    return this.service.login(payload.data)
  }

  private handle<TPayload, TResult>(
    serviceMethod: string,
    handler: (payload: TPayload) => Promise<TResult>
  ): iContracts.iMicroServiceRouteCallback<TPayload, TResult> {
    const wrappedHandler = (payload: TPayload): Promise<TResult> => Promise.resolve().then(() => handler(payload))

    return Object.assign(wrappedHandler, {
      serviceName: this.service.constructor.name,
      serviceMethod
    })
  }
}
