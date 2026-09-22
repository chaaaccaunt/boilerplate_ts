import type { UUID } from "crypto"
import { Exceptions } from "@/libs"

export class RoleService {
  constructor(
    private readonly roleModel: iDatabase.Models["Role"],
    private readonly permissionModel: iDatabase.Models["Permission"],
    private readonly rolePermissionModel: iDatabase.Models["RolePermission"],
    private readonly userRoleModel: iDatabase.Models["UserRole"],
    private readonly databaseTools: iLibs.DatabaseServiceTools
  ) { }

  listRoles(): Promise<iSharedUserRole.UserRoleDto[]> {
    return this.roleModel.findAll({
      order: [["name", "ASC"]],
      include: [this.createRolePermissionsInclude()]
    })
      .then((roles) => roles.map((role) => this.toRoleDto(role)))
  }

  listPermissions(): Promise<iSharedPermission.PermissionDto[]> {
    return this.permissionModel.findAll({ order: [["key", "ASC"]] })
      .then((permissions) => permissions.map((permission) => this.toPermissionDto(permission)))
  }

  createRole(payload: iSharedUserRole.CreateRolePayloadDto, requestId?: string): Promise<iSharedUserRole.CreateRoleResponseDto> {
    const name = this.normalizeRoleName(payload.name)

    return this.assertRoleNameAvailable(name)
      .then(() => this.roleModel.create({ name }, {
        logging: this.createMutationQueryLogger("createRole", "roles insert query", requestId)
      }))
      .then((role) => this.findRoleWithPermissions(role.uid))
      .then((role) => this.toRoleDto(role))
  }

  updateRole(payload: iSharedUserRole.UpdateRolePayloadDto, requestId?: string): Promise<iSharedUserRole.UpdateRoleResponseDto> {
    const name = this.normalizeRoleName(payload.name)

    return this.roleModel.findByPk(payload.uid)
      .then((role) => {
        if (!role) throw new Exceptions.ServiceError.NotFoundError("Роль не найдена")
        this.assertRoleCanBeChanged(role.name)

        return this.assertRoleNameAvailable(name, role.uid)
          .then(() => role.update({ name }, {
            logging: this.createMutationQueryLogger("updateRole", "roles update query", requestId)
          }))
          .then((updatedRole) => this.findRoleWithPermissions(updatedRole.uid))
          .then((updatedRole) => this.toRoleDto(updatedRole))
      })
  }

  deleteRole(payload: iSharedUserRole.DeleteRolePayloadDto, requestId?: string): Promise<iSharedUserRole.DeleteRoleResponseDto> {
    return this.roleModel.findByPk(payload.uid)
      .then((role) => {
        if (!role) throw new Exceptions.ServiceError.NotFoundError("Роль не найдена")
        this.assertRoleCanBeChanged(role.name)

        return this.userRoleModel.count({ where: { roleUid: role.uid } })
          .then((usersCount) => {
            if (usersCount > 0) {
              throw new Exceptions.ServiceError.ConflictError("Нельзя удалить роль, назначенную пользователям")
            }

            return role.destroy({
              logging: this.createMutationQueryLogger("deleteRole", "roles delete query", requestId)
            })
          })
      })
      .then(() => ({ uid: payload.uid }))
  }

  updateRolePermissions(payload: iSharedUserRole.UpdateRolePermissionsPayloadDto, requestId?: string): Promise<iSharedUserRole.UpdateRolePermissionsResponseDto> {
    return this.roleModel.findByPk(payload.uid)
      .then((role) => {
        if (!role) throw new Exceptions.ServiceError.NotFoundError("Роль не найдена")
        this.assertRoleCanBeChanged(role.name)

        return this.getPermissionsByKeys(payload.permissionKeys)
          .then((permissions) => this.updateRolePermissionLinks(role.uid, permissions, requestId))
          .then(() => this.findRoleWithPermissions(role.uid))
          .then((updatedRole) => this.toRoleDto(updatedRole))
      })
  }

  private assertRoleNameAvailable(roleName: iSharedUserRole.UserRoleName, currentRoleUid?: UUID): Promise<void> {
    return this.roleModel.findOne({ where: { name: roleName } })
      .then((role) => {
        if (role && String(role.uid) !== currentRoleUid) {
          throw new Exceptions.ServiceError.ConflictError("Роль с таким именем уже существует")
        }
      })
  }

  private normalizeRoleName(roleName: iSharedUserRole.UserRoleName): iSharedUserRole.UserRoleName {
    const normalizedName = roleName.trim().toLowerCase()

    if (!/^[a-z][a-z0-9_-]{1,63}$/.test(normalizedName)) {
      throw new Exceptions.ServiceError.ConflictError("Имя роли должно содержать латинские буквы, цифры, дефис или подчеркивание")
    }

    return normalizedName
  }

  private assertRoleCanBeChanged(roleName: iSharedUserRole.UserRoleName): void {
    if (this.isSystemRoleName(roleName)) {
      throw new Exceptions.ServiceError.ConflictError("Системную роль нельзя изменить или удалить")
    }
  }

  private isSystemRoleName(roleName: iSharedUserRole.UserRoleName): roleName is iSharedUserRole.SystemUserRoleName {
    return roleName === "superadministrator"
  }

  private getPermissionsByKeys(permissionKeys: iSharedPermission.PermissionKey[]): Promise<iDatabase.Models["Permission"]["prototype"][]> {
    const uniquePermissionKeys = Array.from(new Set(permissionKeys))

    if (!uniquePermissionKeys.length) return Promise.resolve([])

    return this.permissionModel.findAll({
      where: {
        key: uniquePermissionKeys
      }
    })
      .then((permissions) => {
        const existingPermissionKeys = permissions.map((permission) => permission.key)
        const missingPermissionKeys = uniquePermissionKeys.filter((permissionKey) => !existingPermissionKeys.includes(permissionKey))

        if (missingPermissionKeys.length) {
          throw new Exceptions.ServiceError.ConflictError(`Не найдены права: ${missingPermissionKeys.join(", ")}`)
        }

        return permissions
      })
  }

  private updateRolePermissionLinks(roleUid: UUID, permissions: iDatabase.Models["Permission"]["prototype"][], requestId?: string): Promise<void> {
    return this.rolePermissionModel.findAll({ where: { roleUid }, paranoid: false })
      .then((rolePermissions) => {
        const nextPermissionUids = permissions.map((permission) => String(permission.uid))
        const activeRolePermissions = rolePermissions.filter((rolePermission) => !this.isSoftDeletedRolePermission(rolePermission))
        const activePermissionUids = activeRolePermissions.map((rolePermission) => String(rolePermission.permissionUid))
        const removedPermissionUids = activePermissionUids.filter((permissionUid) => !nextPermissionUids.includes(permissionUid))
        const restoredRolePermissions = rolePermissions.filter((rolePermission) => this.isSoftDeletedRolePermission(rolePermission) && nextPermissionUids.includes(String(rolePermission.permissionUid)))
        const existingPermissionUids = rolePermissions.map((rolePermission) => String(rolePermission.permissionUid))
        const addedPermissions = permissions.filter((permission) => !existingPermissionUids.includes(String(permission.uid)))

        return Promise.all([
          removedPermissionUids.length
            ? this.rolePermissionModel.destroy({
              where: { roleUid, permissionUid: removedPermissionUids },
              logging: this.createMutationQueryLogger("updateRolePermissions", "role_permissions delete query", requestId)
            })
            : Promise.resolve(0),
          ...restoredRolePermissions.map((rolePermission) => rolePermission.restore({
            logging: this.createMutationQueryLogger("updateRolePermissions", "role_permissions restore query", requestId)
          })),
          ...addedPermissions.map((permission) => this.rolePermissionModel.create({
            roleUid,
            permissionUid: permission.uid
          }, {
            logging: this.createMutationQueryLogger("updateRolePermissions", "role_permissions insert query", requestId)
          }))
        ])
          .then(() => undefined)
      })
  }

  private isSoftDeletedRolePermission(rolePermission: iDatabase.Models["RolePermission"]["prototype"]): boolean {
    return Boolean((rolePermission as unknown as { deletedAt?: Date | null }).deletedAt)
  }

  private toRoleDto(role: iDatabase.Models["Role"]["prototype"]): iSharedUserRole.UserRoleDto {
    return {
      uid: role.uid,
      name: role.name,
      permissions: (role.rolePermissions || []).map((rolePermission) => this.toPermissionDto(rolePermission.permission))
    }
  }

  private toPermissionDto(permission: iDatabase.Models["Permission"]["prototype"]): iSharedPermission.PermissionDto {
    return {
      uid: permission.uid,
      key: permission.key,
      title: permission.title,
      description: permission.description
    }
  }

  private createRolePermissionsInclude() {
    return {
      association: this.roleModel.associations.rolePermissions,
      include: [{ association: "permission" }]
    }
  }

  private findRoleWithPermissions(roleUid: UUID): Promise<iDatabase.Models["Role"]["prototype"]> {
    return this.roleModel.findByPk(roleUid, {
      include: [this.createRolePermissionsInclude()]
    })
      .then((role) => {
        if (!role) throw new Exceptions.ServiceError.NotFoundError("Роль не найдена")
        return role
      })
  }

  private createMutationQueryLogger(serviceMethod: string, event: string, requestId?: string): (sql: string) => void {
    return this.databaseTools.createDatabaseQueryLogger({
      requestId,
      serviceName: this.constructor.name,
      serviceMethod,
      event,
      mutation: true
    })
  }
}
