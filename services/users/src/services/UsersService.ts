import { hashSync } from "bcryptjs"
import type { UUID } from "crypto"
import { Exceptions } from "@/libs"
import { ServiceTokenEncryptionService } from "./ServiceTokenEncryptionService"

export class UsersService {
  constructor(
    private readonly userModel: iDatabase.Models["User"],
    private readonly roleModel: iDatabase.Models["Role"],
    private readonly permissionModel: iDatabase.Models["Permission"],
    private readonly rolePermissionModel: iDatabase.Models["RolePermission"],
    private readonly userRoleModel: iDatabase.Models["UserRole"],
    private readonly serviceTokenModel: iDatabase.Models["ServiceToken"],
    private readonly databaseTools: iLibs.DatabaseServiceTools,
    private readonly serviceTokenEncryptionService: ServiceTokenEncryptionService
  ) { }

  list(): Promise<iSharedUser.PublicUserDto[]> {
    return this.userModel.findAll({
      order: [["createdAt", "DESC"]],
      include: [{
        association: this.userModel.associations.roles,
        include: [this.createUserRoleRoleInclude()]
      }]
    })
      .then((users) => users.map((user) => this.toPublicUserDto(user)))
  }

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

  create(payload: iSharedUser.CreateUserPayloadDto, requestId?: string): Promise<iSharedUser.PublicUserDto> {
    return this.assertLoginAvailable(payload.login)
      .then(() => this.getRolesByNames(payload.roleNames))
      .then((roles) => this.userModel.create({
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
          })))
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

  updateSuperadministratorUsers(payload: iSharedUser.UpdateSuperadministratorUsersPayloadDto, requestId?: string): Promise<iSharedUser.PublicUserDto[]> {
    const uniqueUserUids = Array.from(new Set(payload.userUids))

    if (!uniqueUserUids.length) {
      throw new Exceptions.ServiceError.ConflictError("Нужен хотя бы один суперадминистратор")
    }

    return this.roleModel.findOne({ where: { name: "superadministrator" } })
      .then((role) => {
        if (!role) throw new Exceptions.ServiceError.NotFoundError("Роль superadministrator не найдена")

        return this.userModel.findAll({ where: { uid: uniqueUserUids } })
          .then((users) => {
            const existingUserUids = users.map((user) => String(user.uid))
            const missingUserUids = uniqueUserUids.filter((userUid) => !existingUserUids.includes(userUid))

            if (missingUserUids.length) {
              throw new Exceptions.ServiceError.ConflictError(`Не найдены пользователи: ${missingUserUids.join(", ")}`)
            }

            return this.updateRoleUsers(role.uid, uniqueUserUids, requestId)
          })
      })
      .then(() => this.list())
  }

  listServiceTokens(): Promise<iSharedServiceToken.ServiceTokenDto[]> {
    return this.serviceTokenModel.findAll({
      order: [["type", "ASC"], ["displayName", "ASC"]]
    })
      .then((tokens) => tokens.map((token) => this.toServiceTokenDto(token)))
  }

  getServiceTokenSecret(type: iSharedServiceToken.ServiceTokenType, serviceName: string): Promise<string> {
    return this.serviceTokenModel.findOne({
      where: {
        type,
        serviceName: serviceName.trim().toLowerCase(),
        isEnabled: true
      }
    })
      .then((token) => {
        if (!token) throw new Exceptions.ServiceError.NotFoundError("Активный токен сервиса не найден")

        return this.serviceTokenEncryptionService.decrypt({
          encryptedToken: token.encryptedToken,
          tokenIv: token.tokenIv,
          tokenAuthTag: token.tokenAuthTag
        })
      })
  }

  createServiceToken(payload: iSharedServiceToken.CreateServiceTokenPayloadDto, requestId?: string): Promise<iSharedServiceToken.CreateServiceTokenResponseDto> {
    const normalizedPayload = this.normalizeServiceTokenPayload(payload)
    const rawToken = this.normalizeServiceTokenSecret(payload.token)
    const encryptedPayload = this.serviceTokenEncryptionService.encrypt(rawToken)

    return this.assertServiceTokenNameAvailable(normalizedPayload.type, normalizedPayload.serviceName)
      .then(() => this.serviceTokenModel.create({
        ...normalizedPayload,
        ...encryptedPayload,
        tokenPreview: this.createTokenPreview(rawToken)
      }, {
        logging: this.createMutationQueryLogger("createServiceToken", "service_tokens insert query", requestId)
      }))
      .then((token) => this.toServiceTokenDto(token))
  }

  updateServiceToken(payload: iSharedServiceToken.UpdateServiceTokenPayloadDto, requestId?: string): Promise<iSharedServiceToken.UpdateServiceTokenResponseDto> {
    const normalizedPayload = this.normalizeServiceTokenPayload(payload)

    return this.serviceTokenModel.findByPk(payload.uid)
      .then((token) => {
        if (!token) throw new Exceptions.ServiceError.NotFoundError("Токен не найден")
        const encryptedPayload = payload.token?.trim()
          ? this.serviceTokenEncryptionService.encrypt(this.normalizeServiceTokenSecret(payload.token))
          : {
            encryptedToken: token.encryptedToken,
            tokenIv: token.tokenIv,
            tokenAuthTag: token.tokenAuthTag
          }
        const tokenPreview = payload.token?.trim()
          ? this.createTokenPreview(this.normalizeServiceTokenSecret(payload.token))
          : token.tokenPreview

        return this.assertServiceTokenNameAvailable(normalizedPayload.type, normalizedPayload.serviceName, token.uid)
          .then(() => token.update({
            ...normalizedPayload,
            ...encryptedPayload,
            tokenPreview
          }, {
            logging: this.createMutationQueryLogger("updateServiceToken", "service_tokens update query", requestId)
          }))
          .then((updatedToken) => this.toServiceTokenDto(updatedToken))
      })
  }

  deleteServiceToken(payload: iSharedServiceToken.DeleteServiceTokenPayloadDto, requestId?: string): Promise<iSharedServiceToken.DeleteServiceTokenResponseDto> {
    return this.serviceTokenModel.findByPk(payload.uid)
      .then((token) => {
        if (!token) throw new Exceptions.ServiceError.NotFoundError("Токен не найден")

        return token.destroy({
          logging: this.createMutationQueryLogger("deleteServiceToken", "service_tokens delete query", requestId)
        })
      })
      .then(() => ({ uid: payload.uid }))
  }

  private assertLoginAvailable(login: string, currentUserUid?: string): Promise<void> {
    return this.userModel.findOne({ where: { login } })
      .then((user) => {
        if (user && String(user.uid) !== currentUserUid) {
          throw new Exceptions.ServiceError.ConflictError("Пользователь с таким логином уже существует")
        }
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

  private updateRoleUsers(roleUid: UUID, userUids: string[], requestId?: string): Promise<void> {
    return this.userRoleModel.findAll({ where: { roleUid }, paranoid: false })
      .then((userRoles) => {
        const activeUserRoles = userRoles.filter((userRole) => !this.isSoftDeletedUserRole(userRole))
        const activeUserUids = activeUserRoles.map((userRole) => String(userRole.userUid))
        const removedUserUids = activeUserUids.filter((userUid) => !userUids.includes(userUid))
        const restoredUserRoles = userRoles.filter((userRole) => this.isSoftDeletedUserRole(userRole) && userUids.includes(String(userRole.userUid)))
        const existingUserUids = userRoles.map((userRole) => String(userRole.userUid))
        const addedUserUids = userUids.filter((userUid) => !existingUserUids.includes(userUid))

        return Promise.all([
          removedUserUids.length
            ? this.userRoleModel.destroy({
              where: { roleUid, userUid: removedUserUids },
              logging: this.createMutationQueryLogger("updateRoleUsers", "user_roles delete query", requestId)
            })
            : Promise.resolve(0),
          ...restoredUserRoles.map((userRole) => userRole.restore({
            logging: this.createMutationQueryLogger("updateRoleUsers", "user_roles restore query", requestId)
          })),
          ...addedUserUids.map((userUid) => this.userRoleModel.create({
            userUid: userUid as UUID,
            roleUid
          }, {
            logging: this.createMutationQueryLogger("updateRoleUsers", "user_roles insert query", requestId)
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

    return this.countSuperadministrators()
      .then((superadministratorsCount) => {
        if (superadministratorsCount <= 1) {
          throw new Exceptions.ServiceError.ConflictError("Нельзя удалить последнего суперадминистратора")
        }
      })
  }

  private countSuperadministrators(): Promise<number> {
    return this.userModel.count({
      distinct: true,
      include: [{
        association: this.userModel.associations.roles,
        required: true,
        include: [{
          association: "role",
          required: true,
          where: {
            name: "superadministrator"
          }
        }]
      }]
    })
  }

  private assertSuperadministratorRoleCanBeUpdated(userUid: UUID, nextRoles: iDatabase.Models["Role"]["prototype"][]): Promise<void> {
    const hasNextSuperadministratorRole = nextRoles.some((role) => role.name === "superadministrator")

    if (hasNextSuperadministratorRole) return Promise.resolve()

    return this.findUserWithRoles(String(userUid))
      .then((user) => {
        const isCurrentSuperadministrator = user.roles.some((userRole) => userRole.role.name === "superadministrator")

        if (!isCurrentSuperadministrator) return undefined

        return this.countSuperadministrators()
          .then((superadministratorsCount) => {
            if (superadministratorsCount <= 1) {
              throw new Exceptions.ServiceError.ConflictError("Нельзя снять права последнего суперадминистратора")
            }
          })
      })
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

  private assertServiceTokenNameAvailable(type: iSharedServiceToken.ServiceTokenType, serviceName: string, currentTokenUid?: UUID): Promise<void> {
    return this.serviceTokenModel.findOne({ where: { type, serviceName } })
      .then((token) => {
        if (token && String(token.uid) !== currentTokenUid) {
          throw new Exceptions.ServiceError.ConflictError("Токен для такого сервиса уже существует")
        }
      })
  }

  private normalizeServiceTokenPayload(payload: iSharedServiceToken.CreateServiceTokenPayloadDto | iSharedServiceToken.UpdateServiceTokenPayloadDto): Omit<iSharedServiceToken.CreateServiceTokenPayloadDto, "token"> {
    const type = payload.type
    const serviceName = payload.serviceName.trim().toLowerCase()
    const displayName = payload.displayName.trim()

    if (!["service", "messenger", "social_network"].includes(type)) {
      throw new Exceptions.ServiceError.ConflictError("Недопустимый тип сервиса")
    }

    if (!/^[a-z][a-z0-9_-]{1,79}$/.test(serviceName)) {
      throw new Exceptions.ServiceError.ConflictError("Системное имя сервиса должно содержать латинские буквы, цифры, дефис или подчеркивание")
    }

    if (!displayName.length) {
      throw new Exceptions.ServiceError.ConflictError("Название сервиса обязательно")
    }

    return {
      type,
      serviceName,
      displayName,
      isEnabled: payload.isEnabled
    }
  }

  private normalizeServiceTokenSecret(token: string): string {
    const normalizedToken = token.trim()

    if (!normalizedToken.length) {
      throw new Exceptions.ServiceError.ConflictError("Токен обязателен")
    }

    return normalizedToken
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

  private toServiceTokenDto(token: iDatabase.Models["ServiceToken"]["prototype"]): iSharedServiceToken.ServiceTokenDto {
    return {
      uid: token.uid,
      type: token.type,
      serviceName: token.serviceName,
      displayName: token.displayName,
      tokenPreview: token.tokenPreview,
      isEnabled: token.isEnabled,
      createdAt: token.createdAt.toISOString(),
      updatedAt: token.updatedAt.toISOString()
    }
  }

  private createTokenPreview(tokenValue: string): string {
    const suffix = tokenValue.slice(-4)
    return suffix ? `••••${suffix}` : "••••"
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
