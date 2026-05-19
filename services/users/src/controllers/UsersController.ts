import { MicroServiceController } from "@/libs"
import { UsersService } from "@/services/UsersService"

export class UsersController extends MicroServiceController {
  constructor(private readonly service: UsersService) {
    super()

    const listRoute: iContracts.iMicroServiceRoute<iContracts.iPayload, iSharedUser.ListUsersResponseDto> = {
      url: /^POST:\/users\/list\/?$/,
      method: "POST",
      callback: this.handle(this.service.constructor.name, "list", this.list.bind(this))
    }

    const createRoute: iContracts.iMicroServiceRoute<iSharedUser.CreateUserPayloadDto, iSharedUser.CreateUserResponseDto> = {
      url: /^POST:\/users\/?$/,
      method: "POST",
      callback: this.handle(this.service.constructor.name, "create", this.create.bind(this))
    }

    const updateRoute: iContracts.iMicroServiceRoute<iSharedUser.UpdateUserPayloadDto, iSharedUser.UpdateUserResponseDto> = {
      url: /^POST:\/users\/update\/?$/,
      method: "POST",
      callback: this.handle(this.service.constructor.name, "update", this.update.bind(this))
    }

    const deleteRoute: iContracts.iMicroServiceRoute<iSharedUser.DeleteUserPayloadDto, iSharedUser.DeleteUserResponseDto> = {
      url: /^POST:\/users\/delete\/?$/,
      method: "POST",
      callback: this.handle(this.service.constructor.name, "delete", this.delete.bind(this))
    }

    const rolesRoute: iContracts.iMicroServiceRoute<iContracts.iPayload, iSharedUser.ListRolesResponseDto> = {
      url: /^POST:\/users\/roles\/list\/?$/,
      method: "POST",
      callback: this.handle(this.service.constructor.name, "listRoles", this.listRoles.bind(this))
    }

    const createRoleRoute: iContracts.iMicroServiceRoute<iSharedUserRole.CreateRolePayloadDto, iSharedUserRole.CreateRoleResponseDto> = {
      url: /^POST:\/users\/roles\/?$/,
      method: "POST",
      callback: this.handle(this.service.constructor.name, "createRole", this.createRole.bind(this))
    }

    const updateRoleRoute: iContracts.iMicroServiceRoute<iSharedUserRole.UpdateRolePayloadDto, iSharedUserRole.UpdateRoleResponseDto> = {
      url: /^POST:\/users\/roles\/update\/?$/,
      method: "POST",
      callback: this.handle(this.service.constructor.name, "updateRole", this.updateRole.bind(this))
    }

    const deleteRoleRoute: iContracts.iMicroServiceRoute<iSharedUserRole.DeleteRolePayloadDto, iSharedUserRole.DeleteRoleResponseDto> = {
      url: /^POST:\/users\/roles\/delete\/?$/,
      method: "POST",
      callback: this.handle(this.service.constructor.name, "deleteRole", this.deleteRole.bind(this))
    }

    this.addRoutes([listRoute, createRoute, updateRoute, deleteRoute, rolesRoute, createRoleRoute, updateRoleRoute, deleteRoleRoute])
  }

  private list(): Promise<iSharedUser.ListUsersResponseDto> {
    return this.service.list()
      .then((users) => ({ users }))
  }

  private create(payload: iContracts.iMicroServiceRequestPayload<iSharedUser.CreateUserPayloadDto>): Promise<iSharedUser.CreateUserResponseDto> {
    if (!payload.data) {
      return Promise.reject(new Error("Отсутствуют данные запроса для UsersService.create"))
    }

    return this.service.create(payload.data, payload.requestId)
  }

  private update(payload: iContracts.iMicroServiceRequestPayload<iSharedUser.UpdateUserPayloadDto>): Promise<iSharedUser.UpdateUserResponseDto> {
    if (!payload.data) {
      return Promise.reject(new Error("Отсутствуют данные запроса для UsersService.update"))
    }

    return this.service.update(payload.data, payload.requestId)
  }

  private delete(payload: iContracts.iMicroServiceRequestPayload<iSharedUser.DeleteUserPayloadDto>): Promise<iSharedUser.DeleteUserResponseDto> {
    if (!payload.data) {
      return Promise.reject(new Error("Отсутствуют данные запроса для UsersService.delete"))
    }

    return this.service.delete(payload.data, payload.requestId)
  }

  private listRoles(): Promise<iSharedUser.ListRolesResponseDto> {
    return this.service.listRoles()
      .then((roles) => ({ roles }))
  }

  private createRole(payload: iContracts.iMicroServiceRequestPayload<iSharedUserRole.CreateRolePayloadDto>): Promise<iSharedUserRole.CreateRoleResponseDto> {
    if (!payload.data) {
      return Promise.reject(new Error("Отсутствуют данные запроса для UsersService.createRole"))
    }

    return this.service.createRole(payload.data, payload.requestId)
  }

  private updateRole(payload: iContracts.iMicroServiceRequestPayload<iSharedUserRole.UpdateRolePayloadDto>): Promise<iSharedUserRole.UpdateRoleResponseDto> {
    if (!payload.data) {
      return Promise.reject(new Error("Отсутствуют данные запроса для UsersService.updateRole"))
    }

    return this.service.updateRole(payload.data, payload.requestId)
  }

  private deleteRole(payload: iContracts.iMicroServiceRequestPayload<iSharedUserRole.DeleteRolePayloadDto>): Promise<iSharedUserRole.DeleteRoleResponseDto> {
    if (!payload.data) {
      return Promise.reject(new Error("Отсутствуют данные запроса для UsersService.deleteRole"))
    }

    return this.service.deleteRole(payload.data, payload.requestId)
  }
}
