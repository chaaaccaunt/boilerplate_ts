import { hashSync } from "bcryptjs"
import type { UUID } from "crypto"
import { Exceptions } from "@/libs"

export class UsersService {
  constructor(
    private readonly userModel: iDatabase.Models["User"],
    private readonly roleModel: iDatabase.Models["Role"],
    private readonly userRoleModel: iDatabase.Models["UserRole"],
    private readonly userSessionModel: iDatabase.Models["UserSession"],
    private readonly databaseTools: iLibs.DatabaseServiceTools
  ) { }

  list(payload: iSharedUser.ListUsersPayloadDto = {}): Promise<iSharedUser.ListUsersResponseDto> {
    const limit = Math.min(Math.max(payload.limit ?? 25, 1), 100)
    const offset = Math.max(payload.offset ?? 0, 0)

    return this.userModel.findAndCountAll({
      distinct: true,
      limit,
      offset,
      order: [["createdAt", "DESC"]],
      include: [{
        association: this.userModel.associations.roles,
        include: [this.createUserRoleRoleInclude()]
      }]
    })
      .then(({ count, rows }) => ({
        users: rows.map((user) => this.toPublicUserDto(user)),
        total: count,
        limit,
        offset
      }))
  }
  create(payload: iSharedUser.CreateUserPayloadDto, requestId?: string): Promise<iSharedUser.PublicUserDto> {
    return this.assertLoginAvailable(payload.login)
      .then(() => this.getRolesByNames(payload.roleNames))
      .then((roles) => {
        this.assertSuperadministratorRoleIsNotAssignedDirectly(roles)

        return this.userModel.create({
          login: payload.login,
          password: hashSync(payload.password, 10),
          firstName: payload.firstName,
          lastName: payload.lastName,
          surname: payload.surname ?? null
        }, {
          logging: this.createMutationQueryLogger("create", "users insert query", requestId)
        })
          .then((user) => Promise.all(roles.map((role) => this.userRoleModel.create({
            userUid: user.uid,
            roleUid: role.uid
          }, {
            logging: this.createMutationQueryLogger("create", "user_roles insert query", requestId)
          })))
            .then((userRoles) => {
              user.roles = userRoles.map((userRole, index) => {
                userRole.role = roles[index]
                return userRole
              })

              return this.findPublicUser(user.uid)
            }))
      })
  }

  update(payload: iSharedUser.UpdateUserPayloadDto, requestId?: string): Promise<iSharedUser.PublicUserDto> {
    return this.userModel.findByPk(payload.uid)
      .then((user) => {
        if (!user) throw new Exceptions.ServiceError.NotFoundError("Пользователь не найден")

        return this.assertLoginAvailable(payload.login, user.uid)
          .then(() => this.getRolesByNames(payload.roleNames))
          .then((roles) => this.assertSuperadministratorRoleCanBeUpdated(user.uid, roles)
            .then(() => user.update({
            login: payload.login,
            firstName: payload.firstName,
            lastName: payload.lastName,
            surname: payload.surname ?? null
          }, {
            logging: this.createMutationQueryLogger("update", "users update query", requestId)
          })
            .then(() => this.updateUserRoles(user.uid, roles, requestId))
            .then(() => this.findPublicUser(user.uid))))
      })
  }

  delete(payload: iSharedUser.DeleteUserPayloadDto, requestId?: string): Promise<iSharedUser.DeleteUserResponseDto> {
    return this.findUserWithRoles(payload.uid)
      .then((user) => this.assertUserCanBeDeleted(user)
        .then(() => user.destroy({
          logging: this.createMutationQueryLogger("delete", "users delete query", requestId)
        }))
      .then(() => ({ uid: payload.uid })))
  }

  transferSuperadministrator(payload: iSharedUser.TransferSuperadministratorPayloadDto, requestId?: string): Promise<iSharedUser.PublicUserDto> {
    return this.roleModel.findOne({ where: { name: "superadministrator" } })
      .then((role) => {
        if (!role) throw new Exceptions.ServiceError.NotFoundError("Роль superadministrator не найдена")

        return this.userModel.findByPk(payload.userUid)
          .then((user) => {
            if (!user) throw new Exceptions.ServiceError.NotFoundError("Пользователь не найден")

            const sequelize = this.userRoleModel.sequelize
            if (!sequelize) throw new Exceptions.ServiceError.InternalError("Не инициализировано подключение к базе данных")

            return sequelize.transaction((transaction) => this.userRoleModel.findAll({
              where: { roleUid: role.uid },
              paranoid: false,
              transaction,
              lock: transaction.LOCK.UPDATE
            })
              .then((userRoles) => {
                const targetUserRole = userRoles.find((userRole) => String(userRole.userUid) === payload.userUid)
                const removedUserUids = userRoles
                  .filter((userRole) => !this.isSoftDeletedUserRole(userRole) && String(userRole.userUid) !== payload.userUid)
                  .map((userRole) => userRole.userUid)
                const affectedUserUids = Array.from(new Set([...removedUserUids, user.uid]))
                const operations: Promise<unknown>[] = []

                if (removedUserUids.length) {
                  operations.push(this.userRoleModel.destroy({
                    where: { roleUid: role.uid, userUid: removedUserUids },
                    transaction,
                    logging: this.createMutationQueryLogger("transferSuperadministrator", "superadministrator user_roles delete query", requestId)
                  }))
                }

                if (targetUserRole && this.isSoftDeletedUserRole(targetUserRole)) {
                  operations.push(targetUserRole.restore({
                    transaction,
                    logging: this.createMutationQueryLogger("transferSuperadministrator", "superadministrator user_roles restore query", requestId)
                  }))
                }

                if (!targetUserRole) {
                  operations.push(this.userRoleModel.create({
                    userUid: user.uid,
                    roleUid: role.uid
                  }, {
                    transaction,
                    logging: this.createMutationQueryLogger("transferSuperadministrator", "superadministrator user_roles insert query", requestId)
                  }))
                }

                operations.push(this.userSessionModel.update({
                  revokedAt: new Date()
                }, {
                  where: {
                    userUid: affectedUserUids,
                    revokedAt: null
                  },
                  transaction,
                  logging: this.createMutationQueryLogger("transferSuperadministrator", "user_sessions revoke query", requestId)
                }))

                return Promise.all(operations).then(() => undefined)
              }))
          })
      })
      .then(() => this.findPublicUser(payload.userUid as UUID))
  }

  private assertLoginAvailable(login: string, currentUserUid?: string): Promise<void> {
    return this.userModel.findOne({ where: { login } })
      .then((user) => {
        if (user && String(user.uid) !== currentUserUid) {
          throw new Exceptions.ServiceError.ConflictError("Пользователь с таким логином уже существует")
        }
      })
  }
  private updateUserRoles(userUid: UUID, roles: iDatabase.Models["Role"]["prototype"][], requestId?: string): Promise<void> {
    return this.userRoleModel.findAll({ where: { userUid }, paranoid: false })
      .then((userRoles) => {
        const nextRoleUids = roles.map((role) => String(role.uid))
        const activeUserRoles = userRoles.filter((userRole) => !this.isSoftDeletedUserRole(userRole))
        const activeRoleUids = activeUserRoles.map((userRole) => String(userRole.roleUid))
        const removedRoleUids = activeRoleUids.filter((roleUid) => !nextRoleUids.includes(roleUid))
        const restoredUserRoles = userRoles.filter((userRole) => this.isSoftDeletedUserRole(userRole) && nextRoleUids.includes(String(userRole.roleUid)))
        const existingRoleUids = userRoles.map((userRole) => String(userRole.roleUid))
        const addedRoles = roles.filter((role) => !existingRoleUids.includes(String(role.uid)))

        return Promise.all([
          removedRoleUids.length
            ? this.userRoleModel.destroy({
              where: { userUid, roleUid: removedRoleUids },
              logging: this.createMutationQueryLogger("updateUserRoles", "user_roles delete query", requestId)
            })
            : Promise.resolve(0),
          ...restoredUserRoles.map((userRole) => userRole.restore({
            logging: this.createMutationQueryLogger("updateUserRoles", "user_roles restore query", requestId)
          })),
          ...addedRoles.map((role) => this.userRoleModel.create({
            userUid,
            roleUid: role.uid
          }, {
            logging: this.createMutationQueryLogger("updateUserRoles", "user_roles insert query", requestId)
          }))
        ])
          .then(() => undefined)
      })
  }

  private isSoftDeletedUserRole(userRole: iDatabase.Models["UserRole"]["prototype"]): boolean {
    return Boolean((userRole as unknown as { deletedAt?: Date | null }).deletedAt)
  }

  private findUserWithRoles(userUid: string): Promise<iDatabase.Models["User"]["prototype"]> {
    return this.userModel.findByPk(userUid, {
      include: [{
        association: this.userModel.associations.roles,
        include: [this.createUserRoleRoleInclude()]
      }]
    })
      .then((user) => {
        if (!user) throw new Exceptions.ServiceError.NotFoundError("Пользователь не найден")
        return user
      })
  }

  private assertUserCanBeDeleted(user: iDatabase.Models["User"]["prototype"]): Promise<void> {
    const isSuperadministrator = user.roles.some((userRole) => userRole.role.name === "superadministrator")

    if (!isSuperadministrator) return Promise.resolve()

    return Promise.reject(new Exceptions.ServiceError.ConflictError("Сначала передайте права суперадминистратора другому пользователю"))
  }

  private assertSuperadministratorRoleCanBeUpdated(userUid: UUID, nextRoles: iDatabase.Models["Role"]["prototype"][]): Promise<void> {
    const hasNextSuperadministratorRole = nextRoles.some((role) => role.name === "superadministrator")

    return this.findUserWithRoles(String(userUid))
      .then((user) => {
        const isCurrentSuperadministrator = user.roles.some((userRole) => userRole.role.name === "superadministrator")

        if (isCurrentSuperadministrator !== hasNextSuperadministratorRole) {
          throw new Exceptions.ServiceError.ConflictError("Права суперадминистратора изменяются только через отдельную операцию передачи")
        }
      })
  }

  private assertSuperadministratorRoleIsNotAssignedDirectly(roles: iDatabase.Models["Role"]["prototype"][]): void {
    if (roles.some((role) => role.name === "superadministrator")) {
      throw new Exceptions.ServiceError.ConflictError("Права суперадминистратора изменяются только через отдельную операцию передачи")
    }
  }

  private findPublicUser(userUid: UUID): Promise<iSharedUser.PublicUserDto> {
    return this.userModel.findByPk(userUid, {
      include: [{
        association: this.userModel.associations.roles,
        include: [this.createUserRoleRoleInclude()]
      }]
    })
      .then((user) => {
        if (!user) throw new Exceptions.ServiceError.NotFoundError("Пользователь не найден")
        return this.toPublicUserDto(user)
      })
  }

  private getRolesByNames(roleNames: iSharedUserRole.UserRoleName[]): Promise<iDatabase.Models["Role"]["prototype"][]> {
    const uniqueRoleNames = Array.from(new Set(roleNames))

    if (!uniqueRoleNames.length) {
      throw new Exceptions.ServiceError.ConflictError("Пользователю нужно назначить хотя бы одну роль")
    }

    return this.roleModel.findAll({
      where: {
        name: uniqueRoleNames
      }
    })
      .then((roles) => {
        const existingRoleNames = roles.map((role) => role.name)
        const missingRoleNames = uniqueRoleNames.filter((roleName) => !existingRoleNames.includes(roleName))

        if (missingRoleNames.length) {
          throw new Exceptions.ServiceError.ConflictError(`Не найдены роли: ${missingRoleNames.join(", ")}`)
        }

        return roles
      })
  }
  private toPublicUserDto(user: iDatabase.Models["User"]["prototype"]): iSharedUser.PublicUserDto {
    const roles = user.roles.map((userRole) => this.toRoleDto(userRole.role))

    return {
      uid: user.uid,
      login: user.login,
      firstName: user.firstName,
      lastName: user.lastName,
      surname: user.surname,
      fullName: user.fullName,
      roles,
      permissions: this.getUniquePermissions(roles)
    }
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

  private getUniquePermissions(roles: iSharedUserRole.UserRoleDto[]): iSharedPermission.PermissionDto[] {
    const permissions = new Map<string, iSharedPermission.PermissionDto>()

    roles.forEach((role) => {
      role.permissions.forEach((permission) => {
        permissions.set(permission.key, permission)
      })
    })

    return Array.from(permissions.values()).sort((left, right) => left.key.localeCompare(right.key))
  }

  private createUserRoleRoleInclude() {
    return {
      association: "role",
      include: [this.createRolePermissionsInclude()]
    }
  }

  private createRolePermissionsInclude() {
    return {
      association: this.roleModel.associations.rolePermissions,
      include: [{ association: "permission" }]
    }
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
