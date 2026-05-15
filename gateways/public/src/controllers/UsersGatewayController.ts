import { Exceptions } from "@/libs"
import { InternalServiceClient } from "@/services/InternalServiceClient"
import { BaseController } from "./BaseController"

export class UsersGatewayController extends BaseController {
  constructor(private readonly usersServiceClient: InternalServiceClient) {
    super()

    const listRoute: iContracts.iRoute<iContracts.iPayload, iContracts.iControllerResult<iSharedUser.ListUsersResponseDto>> = {
      url: /^\/users\/?$/,
      method: "GET",
      requireAuthorization: true,
      callback: this.handle("list", this.list.bind(this))
    }

    const createRoute: iContracts.iRoute<iSharedUser.CreateUserPayloadDto, iContracts.iControllerResult<iSharedUser.CreateUserResponseDto>> = {
      url: /^\/users\/?$/,
      method: "POST",
      requireAuthorization: true,
      validator: {
        login: { isEmail: true },
        password: { isPrimitive: { string: { minLength: 8, maxLength: 128 } } },
        firstName: { isPrimitive: { string: { minLength: 1, maxLength: 64 } } },
        lastName: { isPrimitive: { string: { minLength: 1, maxLength: 64 } } },
        surname: { optional: true, isPrimitive: { string: { minLength: 1, maxLength: 64 } } },
        roleNames: {
          isArray: {
            isPrimitive: {
              string: {
                minLength: 1,
                maxLength: 64,
                reg: /^(administrator|user)$/
              }
            }
          }
        }
      },
      callback: this.handle("create", this.create.bind(this))
    }

    const rolesRoute: iContracts.iRoute<iContracts.iPayload, iContracts.iControllerResult<iSharedUser.ListRolesResponseDto>> = {
      url: /^\/users\/roles\/?$/,
      method: "GET",
      requireAuthorization: true,
      callback: this.handle("listRoles", this.listRoles.bind(this))
    }

    this.addRoutes([listRoute, createRoute, rolesRoute])
  }

  private list(payload: iContracts.iRequestContextPayload): Promise<iContracts.iControllerResult<iSharedUser.ListUsersResponseDto>> {
    this.access(payload, ["administrator"])

    return this.usersServiceClient.request<iSharedUser.ListUsersResponseDto>({
      requestId: payload.requestId,
      method: "GET",
      path: "/users"
    })
      .then((data) => ({ data }))
  }

  private create(payload: iContracts.iRequestContextPayload<iSharedUser.CreateUserPayloadDto>): Promise<iContracts.iControllerResult<iSharedUser.CreateUserResponseDto>> {
    this.access(payload, ["administrator"])

    if (!payload.data) throw new Exceptions.ControllerError.InternalError("Отсутствуют данные запроса для UsersGatewayController.create")

    return this.usersServiceClient.request<iSharedUser.CreateUserResponseDto, iSharedUser.CreateUserPayloadDto>({
      requestId: payload.requestId,
      path: "/users",
      payload: payload.data
    })
      .then((data) => ({ data }))
  }

  private listRoles(payload: iContracts.iRequestContextPayload): Promise<iContracts.iControllerResult<iSharedUser.ListRolesResponseDto>> {
    this.access(payload, ["administrator"])

    return this.usersServiceClient.request<iSharedUser.ListRolesResponseDto>({
      requestId: payload.requestId,
      method: "GET",
      path: "/users/roles"
    })
      .then((data) => ({ data }))
  }
}
