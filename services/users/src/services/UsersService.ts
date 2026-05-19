import { hashSync } from "bcryptjs"
import type { UUID } from "crypto"
import { Exceptions } from "@/libs"

export class UsersService {
  constructor(
    private readonly userModel: iDatabase.Models["User"],
    private readonly roleModel: iDatabase.Models["Role"],
    private readonly userRoleModel: iDatabase.Models["UserRole"],
    private readonly databaseTools: iLibs.DatabaseServiceTools
  ) { }

  list(): Promise<iSharedUser.PublicUserDto[]> {
    return this.userModel.findAll({
      order: [["createdAt", "DESC"]],
      include: [{
        association: this.userModel.associations.roles,
        include: [{ association: "role" }]
      }]
    })
      .then((users) => users.map((user) => this.toPublicUserDto(user)))
  }

  listRoles(): Promise<iSharedUserRole.UserRoleDto[]> {
    return this.roleModel.findAll({ order: [["name", "ASC"]] })
      .then((roles) => roles.map((role) => this.toRoleDto(role)))
  }

  createRole(payload: iSharedUserRole.CreateRolePayloadDto, requestId?: string): Promise<iSharedUserRole.CreateRoleResponseDto> {
    const name = this.normalizeRoleName(payload.name)

    return this.assertRoleNameAvailable(name)
      .then(() => this.roleModel.create({ name }, {
        logging: this.createMutationQueryLogger("createRole", "roles insert query", requestId)
      }))
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

            return this.toPublicUserDto(user)
          })))
  }

  update(payload: iSharedUser.UpdateUserPayloadDto, requestId?: string): Promise<iSharedUser.PublicUserDto> {
    return this.userModel.findByPk(payload.uid)
      .then((user) => {
        if (!user) throw new Exceptions.ServiceError.NotFoundError("Пользователь не найден")

        return this.assertLoginAvailable(payload.login, user.uid)
          .then(() => this.getRolesByNames(payload.roleNames))
          .then((roles) => user.update({
            login: payload.login,
            firstName: payload.firstName,
            lastName: payload.lastName,
            surname: payload.surname ?? null
          }, {
            logging: this.createMutationQueryLogger("update", "users update query", requestId)
          })
            .then(() => this.updateUserRoles(user.uid, roles, requestId))
            .then(() => this.findPublicUser(user.uid)))
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
    if (roleName === "administrator" || roleName === "user") {
      throw new Exceptions.ServiceError.ConflictError("Системную роль нельзя изменить или удалить")
    }
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
        include: [{ association: "role" }]
      }]
    })
      .then((user) => {
        if (!user) throw new Exceptions.ServiceError.NotFoundError("Пользователь не найден")
        return user
      })
  }

  private assertUserCanBeDeleted(user: iDatabase.Models["User"]["prototype"]): Promise<void> {
    const isAdministrator = user.roles.some((userRole) => userRole.role.name === "administrator")

    if (!isAdministrator) return Promise.resolve()

    return this.countAdministrators()
      .then((administratorsCount) => {
        if (administratorsCount <= 1) {
          throw new Exceptions.ServiceError.ConflictError("Нельзя удалить последнего администратора")
        }
      })
  }

  private countAdministrators(): Promise<number> {
    return this.userModel.count({
      distinct: true,
      include: [{
        association: this.userModel.associations.roles,
        required: true,
        include: [{
          association: "role",
          required: true,
          where: {
            name: "administrator"
          }
        }]
      }]
    })
  }

  private findPublicUser(userUid: UUID): Promise<iSharedUser.PublicUserDto> {
    return this.userModel.findByPk(userUid, {
      include: [{
        association: this.userModel.associations.roles,
        include: [{ association: "role" }]
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
    return {
      uid: user.uid,
      login: user.login,
      firstName: user.firstName,
      lastName: user.lastName,
      surname: user.surname,
      fullName: user.fullName,
      roles: user.roles.map((userRole) => this.toRoleDto(userRole.role))
    }
  }

  private toRoleDto(role: iDatabase.Models["Role"]["prototype"]): iSharedUserRole.UserRoleDto {
    return {
      uid: role.uid,
      name: role.name
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
