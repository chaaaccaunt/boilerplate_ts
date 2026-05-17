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
                reg: /^[a-z][a-z0-9_-]{1,63}$/
              }
            }
          }
        }
      },
      callback: this.handle("create", this.create.bind(this))
    }

    const updateRoute: iContracts.iRoute<iSharedUser.UpdateUserPayloadDto, iContracts.iControllerResult<iSharedUser.UpdateUserResponseDto>> = {
      url: /^\/users\/?$/,
      method: "PATCH",
      requireAuthorization: true,
      validator: {
        uid: { isPrimitive: { string: { minLength: 36, maxLength: 36, reg: /^[0-9a-fA-F-]{36}$/ } } },
        login: { isEmail: true },
        firstName: { isPrimitive: { string: { minLength: 1, maxLength: 64 } } },
        lastName: { isPrimitive: { string: { minLength: 1, maxLength: 64 } } },
        surname: { optional: true, isPrimitive: { string: { minLength: 1, maxLength: 64 } } },
        roleNames: {
          isArray: {
            isPrimitive: {
              string: {
                minLength: 1,
                maxLength: 64,
                reg: /^[a-z][a-z0-9_-]{1,63}$/
              }
            }
          }
        }
      },
      callback: this.handle("update", this.update.bind(this))
    }

    const deleteRoute: iContracts.iRoute<iSharedUser.DeleteUserPayloadDto, iContracts.iControllerResult<iSharedUser.DeleteUserResponseDto>> = {
      url: /^\/users\/?$/,
      method: "DELETE",
      requireAuthorization: true,
      validator: {
        uid: { isPrimitive: { string: { minLength: 36, maxLength: 36, reg: /^[0-9a-fA-F-]{36}$/ } } }
      },
      callback: this.handle("delete", this.delete.bind(this))
    }

    const rolesRoute: iContracts.iRoute<iContracts.iPayload, iContracts.iControllerResult<iSharedUser.ListRolesResponseDto>> = {
      url: /^\/users\/roles\/?$/,
      method: "GET",
      requireAuthorization: true,
      callback: this.handle("listRoles", this.listRoles.bind(this))
    }

    const createRoleRoute: iContracts.iRoute<iSharedUserRole.CreateRolePayloadDto, iContracts.iControllerResult<iSharedUserRole.CreateRoleResponseDto>> = {
      url: /^\/users\/roles\/?$/,
      method: "POST",
      requireAuthorization: true,
      validator: {
        name: { isPrimitive: { string: { minLength: 2, maxLength: 64, reg: /^[a-z][a-z0-9_-]{1,63}$/ } } }
      },
      callback: this.handle("createRole", this.createRole.bind(this))
    }

    const updateRoleRoute: iContracts.iRoute<iSharedUserRole.UpdateRolePayloadDto, iContracts.iControllerResult<iSharedUserRole.UpdateRoleResponseDto>> = {
      url: /^\/users\/roles\/?$/,
      method: "PATCH",
      requireAuthorization: true,
      validator: {
        uid: { isPrimitive: { string: { minLength: 36, maxLength: 36, reg: /^[0-9a-fA-F-]{36}$/ } } },
        name: { isPrimitive: { string: { minLength: 2, maxLength: 64, reg: /^[a-z][a-z0-9_-]{1,63}$/ } } }
      },
      callback: this.handle("updateRole", this.updateRole.bind(this))
    }

    const deleteRoleRoute: iContracts.iRoute<iSharedUserRole.DeleteRolePayloadDto, iContracts.iControllerResult<iSharedUserRole.DeleteRoleResponseDto>> = {
      url: /^\/users\/roles\/?$/,
      method: "DELETE",
      requireAuthorization: true,
      validator: {
        uid: { isPrimitive: { string: { minLength: 36, maxLength: 36, reg: /^[0-9a-fA-F-]{36}$/ } } }
      },
      callback: this.handle("deleteRole", this.deleteRole.bind(this))
    }

    this.addRoutes([listRoute, createRoute, updateRoute, deleteRoute, rolesRoute, createRoleRoute, updateRoleRoute, deleteRoleRoute])
  }

  private list(payload: iContracts.iRequestContextPayload): Promise<iContracts.iControllerResult<iSharedUser.ListUsersResponseDto>> {
    this.access(payload, ["administrator"])

    return this.usersServiceClient.request<iSharedUser.ListUsersResponseDto>({
      requestId: payload.requestId,
      path: "/users/list"
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

  private update(payload: iContracts.iRequestContextPayload<iSharedUser.UpdateUserPayloadDto>): Promise<iContracts.iControllerResult<iSharedUser.UpdateUserResponseDto>> {
    this.access(payload, ["administrator"])

    if (!payload.data) throw new Exceptions.ControllerError.InternalError("Отсутствуют данные запроса для UsersGatewayController.update")

    return this.usersServiceClient.request<iSharedUser.UpdateUserResponseDto, iSharedUser.UpdateUserPayloadDto>({
      requestId: payload.requestId,
      path: "/users/update",
      payload: payload.data
    })
      .then((data) => ({ data }))
  }

  private delete(payload: iContracts.iRequestContextPayload<iSharedUser.DeleteUserPayloadDto>): Promise<iContracts.iControllerResult<iSharedUser.DeleteUserResponseDto>> {
    this.access(payload, ["administrator"])

    if (!payload.data) throw new Exceptions.ControllerError.InternalError("Отсутствуют данные запроса для UsersGatewayController.delete")

    return this.usersServiceClient.request<iSharedUser.DeleteUserResponseDto, iSharedUser.DeleteUserPayloadDto>({
      requestId: payload.requestId,
      path: "/users/delete",
      payload: payload.data
    })
      .then((data) => ({ data }))
  }

  private listRoles(payload: iContracts.iRequestContextPayload): Promise<iContracts.iControllerResult<iSharedUser.ListRolesResponseDto>> {
    this.access(payload, ["administrator"])

    return this.usersServiceClient.request<iSharedUser.ListRolesResponseDto>({
      requestId: payload.requestId,
      path: "/users/roles/list"
    })
      .then((data) => ({ data }))
  }

  private createRole(payload: iContracts.iRequestContextPayload<iSharedUserRole.CreateRolePayloadDto>): Promise<iContracts.iControllerResult<iSharedUserRole.CreateRoleResponseDto>> {
    this.access(payload, ["administrator"])

    if (!payload.data) throw new Exceptions.ControllerError.InternalError("Отсутствуют данные запроса для UsersGatewayController.createRole")

    return this.usersServiceClient.request<iSharedUserRole.CreateRoleResponseDto, iSharedUserRole.CreateRolePayloadDto>({
      requestId: payload.requestId,
      path: "/users/roles",
      payload: payload.data
    })
      .then((data) => ({ data }))
  }

  private updateRole(payload: iContracts.iRequestContextPayload<iSharedUserRole.UpdateRolePayloadDto>): Promise<iContracts.iControllerResult<iSharedUserRole.UpdateRoleResponseDto>> {
    this.access(payload, ["administrator"])

    if (!payload.data) throw new Exceptions.ControllerError.InternalError("Отсутствуют данные запроса для UsersGatewayController.updateRole")

    return this.usersServiceClient.request<iSharedUserRole.UpdateRoleResponseDto, iSharedUserRole.UpdateRolePayloadDto>({
      requestId: payload.requestId,
      path: "/users/roles/update",
      payload: payload.data
    })
      .then((data) => ({ data }))
  }

  private deleteRole(payload: iContracts.iRequestContextPayload<iSharedUserRole.DeleteRolePayloadDto>): Promise<iContracts.iControllerResult<iSharedUserRole.DeleteRoleResponseDto>> {
    this.access(payload, ["administrator"])

    if (!payload.data) throw new Exceptions.ControllerError.InternalError("Отсутствуют данные запроса для UsersGatewayController.deleteRole")

    return this.usersServiceClient.request<iSharedUserRole.DeleteRoleResponseDto, iSharedUserRole.DeleteRolePayloadDto>({
      requestId: payload.requestId,
      path: "/users/roles/delete",
      payload: payload.data
    })
      .then((data) => ({ data }))
  }
}

