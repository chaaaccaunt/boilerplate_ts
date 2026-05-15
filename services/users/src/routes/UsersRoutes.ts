import { UsersService } from "@/services/UsersService"

export class UsersRoutes {
  private readonly routes: iContracts.iMicroServiceRoute[]

  constructor(private readonly service: UsersService) {
    const listRoute: iContracts.iMicroServiceRoute<iContracts.iPayload, iSharedUser.ListUsersResponseDto> = {
      url: /^\/users\/?$/,
      method: "GET",
      callback: this.handle("list", this.list.bind(this))
    }

    const createRoute: iContracts.iMicroServiceRoute<iSharedUser.CreateUserPayloadDto, iSharedUser.CreateUserResponseDto> = {
      url: /^\/users\/?$/,
      method: "POST",
      callback: this.handle("create", this.create.bind(this))
    }

    const rolesRoute: iContracts.iMicroServiceRoute<iContracts.iPayload, iSharedUser.ListRolesResponseDto> = {
      url: /^\/users\/roles\/?$/,
      method: "GET",
      callback: this.handle("listRoles", this.listRoles.bind(this))
    }

    this.routes = [listRoute, createRoute, rolesRoute]
  }

  getRoutes(): readonly iContracts.iMicroServiceRoute[] {
    return this.routes
  }

  private list(): Promise<iSharedUser.ListUsersResponseDto> {
    return this.service.list()
      .then((users) => ({ users }))
  }

  private create(payload: iContracts.iMicroServiceRequestPayload<iSharedUser.CreateUserPayloadDto>): Promise<iSharedUser.CreateUserResponseDto> {
    if (!payload.data) {
      return Promise.reject(new Error("Отсутствуют данные запроса для UsersService.create"))
    }

    return this.service.create(payload.data)
  }

  private listRoles(): Promise<iSharedUser.ListRolesResponseDto> {
    return this.service.listRoles()
      .then((roles) => ({ roles }))
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
