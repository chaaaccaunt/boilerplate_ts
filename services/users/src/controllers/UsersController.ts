import { MicroServiceController } from "@/libs"
import { UsersService } from "../services/UsersService"
import { RoleService } from "../services/RoleService"

export class UsersController extends MicroServiceController {
  constructor(
    private readonly service: UsersService,
    private readonly roleService: RoleService
  ) {
    super()

    const listRoute: iContracts.iMicroServiceRoute<iSharedUser.ListUsersPayloadDto, iSharedUser.ListUsersResponseDto> = {
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
      callback: this.handle(this.roleService.constructor.name, "listRoles", this.listRoles.bind(this))
    }

    const createRoleRoute: iContracts.iMicroServiceRoute<iSharedUserRole.CreateRolePayloadDto, iSharedUserRole.CreateRoleResponseDto> = {
      url: /^POST:\/users\/roles\/?$/,
      method: "POST",
      callback: this.handle(this.roleService.constructor.name, "createRole", this.createRole.bind(this))
    }

    const updateRoleRoute: iContracts.iMicroServiceRoute<iSharedUserRole.UpdateRolePayloadDto, iSharedUserRole.UpdateRoleResponseDto> = {
      url: /^POST:\/users\/roles\/update\/?$/,
      method: "POST",
      callback: this.handle(this.roleService.constructor.name, "updateRole", this.updateRole.bind(this))
    }

    const deleteRoleRoute: iContracts.iMicroServiceRoute<iSharedUserRole.DeleteRolePayloadDto, iSharedUserRole.DeleteRoleResponseDto> = {
      url: /^POST:\/users\/roles\/delete\/?$/,
      method: "POST",
      callback: this.handle(this.roleService.constructor.name, "deleteRole", this.deleteRole.bind(this))
    }

    const permissionsRoute: iContracts.iMicroServiceRoute<iContracts.iPayload, iSharedUser.ListPermissionsResponseDto> = {
      url: /^POST:\/users\/permissions\/list\/?$/,
      method: "POST",
      callback: this.handle(this.roleService.constructor.name, "listPermissions", this.listPermissions.bind(this))
    }

    const updateRolePermissionsRoute: iContracts.iMicroServiceRoute<iSharedUserRole.UpdateRolePermissionsPayloadDto, iSharedUserRole.UpdateRolePermissionsResponseDto> = {
      url: /^POST:\/users\/roles\/permissions\/update\/?$/,
      method: "POST",
      callback: this.handle(this.roleService.constructor.name, "updateRolePermissions", this.updateRolePermissions.bind(this))
    }

    const updateSuperadministratorUsersRoute: iContracts.iMicroServiceRoute<iSharedUser.UpdateSuperadministratorUsersPayloadDto, iSharedUser.UpdateSuperadministratorUsersResponseDto> = {
      url: /^POST:\/users\/superadministrators\/update\/?$/,
      method: "POST",
      callback: this.handle(this.service.constructor.name, "updateSuperadministratorUsers", this.updateSuperadministratorUsers.bind(this))
    }

    const listSuperadministratorUsersRoute: iContracts.iMicroServiceRoute<iContracts.iPayload, iSharedUser.ListSuperadministratorUsersResponseDto> = {
      url: /^POST:\/users\/superadministrators\/list\/?$/,
      method: "POST",
      callback: this.handle(this.service.constructor.name, "listSuperadministratorUserUids", this.listSuperadministratorUsers.bind(this))
    }

    this.addRoutes([listRoute, createRoute, updateRoute, deleteRoute, rolesRoute, createRoleRoute, updateRoleRoute, deleteRoleRoute, permissionsRoute, updateRolePermissionsRoute, updateSuperadministratorUsersRoute, listSuperadministratorUsersRoute])
  }

  private list(payload: iContracts.iMicroServiceRequestPayload<iSharedUser.ListUsersPayloadDto>): Promise<iSharedUser.ListUsersResponseDto> {
    return this.service.list(payload.data)
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
    return this.roleService.listRoles()
      .then((roles) => ({ roles }))
  }

  private listPermissions(): Promise<iSharedUser.ListPermissionsResponseDto> {
    return this.roleService.listPermissions()
      .then((permissions) => ({ permissions }))
  }

  private createRole(payload: iContracts.iMicroServiceRequestPayload<iSharedUserRole.CreateRolePayloadDto>): Promise<iSharedUserRole.CreateRoleResponseDto> {
    if (!payload.data) {
      return Promise.reject(new Error("Отсутствуют данные запроса для UsersService.createRole"))
    }

    return this.roleService.createRole(payload.data, payload.requestId)
  }

  private updateRole(payload: iContracts.iMicroServiceRequestPayload<iSharedUserRole.UpdateRolePayloadDto>): Promise<iSharedUserRole.UpdateRoleResponseDto> {
    if (!payload.data) {
      return Promise.reject(new Error("Отсутствуют данные запроса для UsersService.updateRole"))
    }

    return this.roleService.updateRole(payload.data, payload.requestId)
  }

  private deleteRole(payload: iContracts.iMicroServiceRequestPayload<iSharedUserRole.DeleteRolePayloadDto>): Promise<iSharedUserRole.DeleteRoleResponseDto> {
    if (!payload.data) {
      return Promise.reject(new Error("Отсутствуют данные запроса для UsersService.deleteRole"))
    }

    return this.roleService.deleteRole(payload.data, payload.requestId)
  }

  private updateRolePermissions(payload: iContracts.iMicroServiceRequestPayload<iSharedUserRole.UpdateRolePermissionsPayloadDto>): Promise<iSharedUserRole.UpdateRolePermissionsResponseDto> {
    if (!payload.data) {
      return Promise.reject(new Error("Отсутствуют данные запроса для UsersService.updateRolePermissions"))
    }

    return this.roleService.updateRolePermissions(payload.data, payload.requestId)
  }

  private updateSuperadministratorUsers(payload: iContracts.iMicroServiceRequestPayload<iSharedUser.UpdateSuperadministratorUsersPayloadDto>): Promise<iSharedUser.UpdateSuperadministratorUsersResponseDto> {
    if (!payload.data) {
      return Promise.reject(new Error("Отсутствуют данные запроса для UsersService.updateSuperadministratorUsers"))
    }

    return this.service.updateSuperadministratorUsers(payload.data, payload.requestId)
      .then((users) => ({ users }))
  }

  private listSuperadministratorUsers(): Promise<iSharedUser.ListSuperadministratorUsersResponseDto> {
    return this.service.listSuperadministratorUserUids()
      .then((userUids) => ({ userUids }))
  }

}
