import { Exceptions } from "../Exceptions"

export abstract class HTTPController {
  protected readonly routes: iContracts.iRoute[] = []

  public getRoutes(): readonly iContracts.iRoute[] {
    return this.routes
  }

  protected addRoutes(routes: iContracts.iRoute[]): void {
    this.routes.push(...routes)
  }

  protected access(
    payload: { user?: iContracts.iUserToken },
    allowedRoles: readonly iSharedUserRole.UserRoleName[] = []
  ): iContracts.iUserToken {
    if (!payload.user) throw new Exceptions.ControllerError.UnauthorizedError()
    if (!allowedRoles.length) return payload.user

    const roleNames = this.getUserRoleNames(payload.user)
    const hasAllowedRole = allowedRoles.some((roleName) => roleNames.includes(roleName))

    if (!hasAllowedRole) throw new Exceptions.ControllerError.AccessDeniedError()

    return payload.user
  }

  protected accessPermissions(
    payload: { user?: iContracts.iUserToken },
    allowedPermissions: readonly iSharedPermission.PermissionKey[] = [],
    fallbackAllowedRoles: readonly iSharedUserRole.UserRoleName[] = []
  ): iContracts.iUserToken {
    if (!payload.user) throw new Exceptions.ControllerError.UnauthorizedError()
    if (!allowedPermissions.length) return this.access(payload, fallbackAllowedRoles)

    const permissionKeys = this.getUserPermissionKeys(payload.user)
    const hasAllowedPermission = allowedPermissions.some((permissionKey) => permissionKeys.includes(permissionKey))

    if (hasAllowedPermission) return payload.user
    if (!fallbackAllowedRoles.length) throw new Exceptions.ControllerError.AccessDeniedError()
    return this.access(payload, fallbackAllowedRoles)
  }

  protected handle<TPayload, TResult>(
    controllerMethod: string,
    handler: (payload: TPayload) => Promise<TResult>
  ): iContracts.iRouteCallback<TPayload, TResult> {
    const wrappedHandler = (payload: TPayload): Promise<TResult> => Promise.resolve()
      .then(() => handler(payload))
      .catch((error) => {
        throw this.mapControllerError(error)
      })

    return Object.assign(wrappedHandler, {
      controllerName: this.constructor.name,
      controllerMethod
    })
  }

  private mapControllerError(error: unknown): Error {
    if (error instanceof Exceptions.ControllerError.AccessDeniedError) return error
    if (error instanceof Exceptions.ControllerError.UnauthorizedError) return error
    if (error instanceof Exceptions.ControllerError.NotFoundError) return error
    if (error instanceof Exceptions.ControllerError.ConflictError) return error
    if (error instanceof Exceptions.ControllerError.InternalError) return error
    if (error instanceof Exceptions.ServiceError.NotFoundError) return new Exceptions.ControllerError.NotFoundError(error.message, { cause: error })
    if (error instanceof Exceptions.ServiceError.AuthenticationError) return new Exceptions.ControllerError.UnauthorizedError(error.message, { cause: error })
    if (error instanceof Exceptions.ServiceError.ConflictError) return new Exceptions.ControllerError.ConflictError(error.message, { cause: error })
    if (error instanceof Exceptions.ServiceError.InternalError) return new Exceptions.ControllerError.InternalError(error.message, { cause: error })
    if (error instanceof Error) return new Exceptions.ControllerError.InternalError(error.message, { cause: error })

    return new Exceptions.ControllerError.InternalError("Необработанная ошибка контроллера", { cause: error })
  }

  private getUserRoleNames(user: iContracts.iUserToken): iSharedUserRole.UserRoleName[] {
    const roles = user.claims?.roles

    if (!Array.isArray(roles)) return []

    return roles.filter((role): role is iSharedUserRole.UserRoleName => typeof role === "string")
  }

  private getUserPermissionKeys(user: iContracts.iUserToken): iSharedPermission.PermissionKey[] {
    const permissions = user.claims?.permissions

    if (!Array.isArray(permissions)) return []

    return permissions.filter((permission): permission is iSharedPermission.PermissionKey => typeof permission === "string")
  }
}
