import { Exceptions } from "@/libs"
import { MicroServiceHTTPClient } from "@/libs"
import { HTTPController } from "@/libs"

export class UsersGatewayController extends HTTPController {
  constructor(
    private readonly usersServiceClient: MicroServiceHTTPClient,
    private readonly notificationsServiceClient: MicroServiceHTTPClient
  ) {
    super()

    const listRoute: iContracts.iRoute<iSharedUser.ListUsersPayloadDto, iContracts.iControllerResult<iSharedUser.ListUsersResponseDto>> = {
      url: /^\/users(?:\?.*)?$/,
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

    const permissionsRoute: iContracts.iRoute<iContracts.iPayload, iContracts.iControllerResult<iSharedUser.ListPermissionsResponseDto>> = {
      url: /^\/users\/permissions\/?$/,
      method: "GET",
      requireAuthorization: true,
      callback: this.handle("listPermissions", this.listPermissions.bind(this))
    }

    const updateRolePermissionsRoute: iContracts.iRoute<iSharedUserRole.UpdateRolePermissionsPayloadDto, iContracts.iControllerResult<iSharedUserRole.UpdateRolePermissionsResponseDto>> = {
      url: /^\/users\/roles\/permissions\/?$/,
      method: "PATCH",
      requireAuthorization: true,
      validator: {
        uid: { isPrimitive: { string: { minLength: 36, maxLength: 36, reg: /^[0-9a-fA-F-]{36}$/ } } },
        permissionKeys: {
          isArray: {
            isPrimitive: {
              string: {
                minLength: 1,
                maxLength: 128,
                reg: /^[a-z][a-z0-9_.-]{1,127}$/
              }
            }
          }
        }
      },
      callback: this.handle("updateRolePermissions", this.updateRolePermissions.bind(this))
    }

    const transferSuperadministratorRoute: iContracts.iRoute<iSharedUser.TransferSuperadministratorPayloadDto, iContracts.iControllerResult<iSharedUser.TransferSuperadministratorResponseDto>> = {
      url: /^\/users\/superadministrator\/transfer\/?$/,
      method: "POST",
      requireAuthorization: true,
      validator: {
        userUid: { isPrimitive: { string: { minLength: 36, maxLength: 36, reg: /^[0-9a-fA-F-]{36}$/ } } }
      },
      callback: this.handle("transferSuperadministrator", this.transferSuperadministrator.bind(this))
    }

    this.addRoutes([listRoute, createRoute, updateRoute, deleteRoute, rolesRoute, createRoleRoute, updateRoleRoute, deleteRoleRoute, permissionsRoute, updateRolePermissionsRoute, transferSuperadministratorRoute])
  }

  private list(payload: iContracts.iRequestContextPayload<iSharedUser.ListUsersPayloadDto>): Promise<iContracts.iControllerResult<iSharedUser.ListUsersResponseDto>> {
    this.access(payload)

    return this.usersServiceClient.request<iSharedUser.ListUsersResponseDto, iSharedUser.ListUsersPayloadDto>({
      requestId: payload.requestId,
      path: "/users/list",
      payload: {
        limit: this.getPaginationNumber(payload.data?.limit, 25, 1, 100),
        offset: this.getPaginationNumber(payload.data?.offset, 0, 0, Number.MAX_SAFE_INTEGER)
      }
    })
      .then((data) => ({ data }))
  }

  private getPaginationNumber(value: unknown, defaultValue: number, minimum: number, maximum: number): number {
    if (value === undefined || value === null || value === "") return defaultValue

    const numberValue = typeof value === "number" ? value : Number(value)
    if (!Number.isSafeInteger(numberValue) || numberValue < minimum || numberValue > maximum) {
      throw new Exceptions.ControllerError.ConflictError("Некорректные параметры пагинации пользователей")
    }

    return numberValue
  }

  private create(payload: iContracts.iRequestContextPayload<iSharedUser.CreateUserPayloadDto>): Promise<iContracts.iControllerResult<iSharedUser.CreateUserResponseDto>> {
    this.accessPermissions(payload, ["users.manage"], ["superadministrator"])

    if (!payload.data) throw new Exceptions.ControllerError.InternalError("Отсутствуют данные запроса для UsersGatewayController.create")

    return this.usersServiceClient.request<iSharedUser.CreateUserResponseDto, iSharedUser.CreateUserPayloadDto>({
      requestId: payload.requestId,
      path: "/users",
      payload: payload.data
    })
      .then((data) => ({ data }))
  }

  private update(payload: iContracts.iRequestContextPayload<iSharedUser.UpdateUserPayloadDto>): Promise<iContracts.iControllerResult<iSharedUser.UpdateUserResponseDto>> {
    this.accessPermissions(payload, ["users.manage"], ["superadministrator"])

    if (!payload.data) throw new Exceptions.ControllerError.InternalError("Отсутствуют данные запроса для UsersGatewayController.update")

    return this.assertCanUpdateUserRoles(payload)
      .then(() => this.usersServiceClient.request<iSharedUser.UpdateUserResponseDto, iSharedUser.UpdateUserPayloadDto>({
        requestId: payload.requestId,
        path: "/users/update",
        payload: payload.data
      }))
      .then((data) => this.notificationsServiceClient.request<iSharedNotifications.NotificationDto, iSharedNotifications.CreateNotificationPayloadDto>({
        requestId: payload.requestId,
        path: "/notifications/create",
        payload: {
          userUid: payload.data!.uid,
          kind: "permissions",
          title: "Права аккаунта изменены",
          message: "Администратор обновил данные или роли вашего аккаунта.",
          link: "/settings"
        }
      }).catch(() => undefined).then(() => ({ data })))
  }

  private delete(payload: iContracts.iRequestContextPayload<iSharedUser.DeleteUserPayloadDto>): Promise<iContracts.iControllerResult<iSharedUser.DeleteUserResponseDto>> {
    this.accessPermissions(payload, ["users.manage"], ["superadministrator"])

    if (!payload.data) throw new Exceptions.ControllerError.InternalError("Отсутствуют данные запроса для UsersGatewayController.delete")

    return this.usersServiceClient.request<iSharedUser.DeleteUserResponseDto, iSharedUser.DeleteUserPayloadDto>({
      requestId: payload.requestId,
      path: "/users/delete",
      payload: payload.data
    })
      .then((data) => ({ data }))
  }

  private listRoles(payload: iContracts.iRequestContextPayload): Promise<iContracts.iControllerResult<iSharedUser.ListRolesResponseDto>> {
    this.access(payload)

    return this.usersServiceClient.request<iSharedUser.ListRolesResponseDto>({
      requestId: payload.requestId,
      path: "/users/roles/list"
    })
      .then((data) => ({ data }))
  }

  private listPermissions(payload: iContracts.iRequestContextPayload): Promise<iContracts.iControllerResult<iSharedUser.ListPermissionsResponseDto>> {
    this.access(payload)

    return this.usersServiceClient.request<iSharedUser.ListPermissionsResponseDto>({
      requestId: payload.requestId,
      path: "/users/permissions/list"
    })
      .then((data) => ({ data }))
  }

  private createRole(payload: iContracts.iRequestContextPayload<iSharedUserRole.CreateRolePayloadDto>): Promise<iContracts.iControllerResult<iSharedUserRole.CreateRoleResponseDto>> {
    this.accessPermissions(payload, ["roles.manage"], ["superadministrator"])

    if (!payload.data) throw new Exceptions.ControllerError.InternalError("Отсутствуют данные запроса для UsersGatewayController.createRole")

    return this.usersServiceClient.request<iSharedUserRole.CreateRoleResponseDto, iSharedUserRole.CreateRolePayloadDto>({
      requestId: payload.requestId,
      path: "/users/roles",
      payload: payload.data
    })
      .then((data) => ({ data }))
  }

  private updateRole(payload: iContracts.iRequestContextPayload<iSharedUserRole.UpdateRolePayloadDto>): Promise<iContracts.iControllerResult<iSharedUserRole.UpdateRoleResponseDto>> {
    this.accessPermissions(payload, ["roles.manage"], ["superadministrator"])

    if (!payload.data) throw new Exceptions.ControllerError.InternalError("Отсутствуют данные запроса для UsersGatewayController.updateRole")

    return this.usersServiceClient.request<iSharedUserRole.UpdateRoleResponseDto, iSharedUserRole.UpdateRolePayloadDto>({
      requestId: payload.requestId,
      path: "/users/roles/update",
      payload: payload.data
    })
      .then((data) => ({ data }))
  }

  private deleteRole(payload: iContracts.iRequestContextPayload<iSharedUserRole.DeleteRolePayloadDto>): Promise<iContracts.iControllerResult<iSharedUserRole.DeleteRoleResponseDto>> {
    this.accessPermissions(payload, ["roles.manage"], ["superadministrator"])

    if (!payload.data) throw new Exceptions.ControllerError.InternalError("Отсутствуют данные запроса для UsersGatewayController.deleteRole")

    return this.usersServiceClient.request<iSharedUserRole.DeleteRoleResponseDto, iSharedUserRole.DeleteRolePayloadDto>({
      requestId: payload.requestId,
      path: "/users/roles/delete",
      payload: payload.data
    })
      .then((data) => ({ data }))
  }

  private updateRolePermissions(payload: iContracts.iRequestContextPayload<iSharedUserRole.UpdateRolePermissionsPayloadDto>): Promise<iContracts.iControllerResult<iSharedUserRole.UpdateRolePermissionsResponseDto>> {
    this.accessPermissions(payload, ["roles.manage"], ["superadministrator"])

    if (!payload.data) throw new Exceptions.ControllerError.InternalError("Отсутствуют данные запроса для UsersGatewayController.updateRolePermissions")

    return this.usersServiceClient.request<iSharedUserRole.UpdateRolePermissionsResponseDto, iSharedUserRole.UpdateRolePermissionsPayloadDto>({
      requestId: payload.requestId,
      path: "/users/roles/permissions/update",
      payload: payload.data
    })
      .then((data) => this.notifyRolePermissionChange(payload.data!.uid, payload.requestId).then(() => ({ data })))
  }

  private notifyRolePermissionChange(roleUid: string, requestId: string): Promise<void> {
    return this.usersServiceClient.request<iSharedUser.ListUsersResponseDto, iSharedUser.ListUsersPayloadDto>({
      requestId,
      path: "/users/list",
      payload: { limit: 100, offset: 0 }
    }).then((result) => Promise.allSettled(result.users
      .filter((user) => user.roles.some((role) => role.uid === roleUid))
      .map((user) => this.notificationsServiceClient.request({
        requestId,
        path: "/notifications/create",
        payload: {
          userUid: user.uid,
          kind: "permissions",
          title: "Набор прав изменён",
          message: "Администратор обновил разрешения одной из ваших ролей.",
          link: "/settings"
        } satisfies iSharedNotifications.CreateNotificationPayloadDto
      })))).then(() => undefined)
  }

  private transferSuperadministrator(payload: iContracts.iRequestContextPayload<iSharedUser.TransferSuperadministratorPayloadDto>): Promise<iContracts.iControllerResult<iSharedUser.TransferSuperadministratorResponseDto>> {
    this.access(payload, ["superadministrator"])

    if (!payload.data) throw new Exceptions.ControllerError.InternalError("Отсутствуют данные запроса для UsersGatewayController.transferSuperadministrator")

    return this.usersServiceClient.request<iSharedUser.TransferSuperadministratorResponseDto, iSharedUser.TransferSuperadministratorPayloadDto>({
      requestId: payload.requestId,
      path: "/users/superadministrator/transfer",
      payload: payload.data
    })
      .then((data) => ({ data }))
  }

  private assertCanUpdateUserRoles(payload: iContracts.iRequestContextPayload<iSharedUser.UpdateUserPayloadDto>): Promise<void> {
    if (!payload.data) throw new Exceptions.ControllerError.InternalError("Отсутствуют данные запроса для UsersGatewayController.assertCanUpdateUserRoles")
    if (this.hasSuperadministratorRole(payload)) return Promise.resolve()
    if (payload.data.roleNames.includes("superadministrator")) throw new Exceptions.ControllerError.AccessDeniedError()

    return this.usersServiceClient.request<iSharedUser.ListUsersResponseDto>({
      requestId: payload.requestId,
      path: "/users/list"
    })
      .then((data) => {
        const updatedUser = data.users.find((user) => user.uid === payload.data?.uid)
        const updatesSuperadministrator = updatedUser?.roles.some((role) => role.name === "superadministrator")

        if (updatesSuperadministrator) throw new Exceptions.ControllerError.AccessDeniedError()
      })
  }

  private hasSuperadministratorRole(payload: iContracts.iRequestContextPayload): boolean {
    const roles = payload.user?.claims?.roles

    return Array.isArray(roles) && roles.includes("superadministrator")
  }
}
