import { hashSync } from "bcryptjs"
import { Exceptions } from "@/libs"

export class UsersService {
  constructor(
    private readonly userModel: iDatabase.Models["User"],
    private readonly roleModel: iDatabase.Models["Role"],
    private readonly userRoleModel: iDatabase.Models["UserRole"]
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

  create(payload: iSharedUser.CreateUserPayloadDto): Promise<iSharedUser.PublicUserDto> {
    return this.assertLoginAvailable(payload.login)
      .then(() => this.getRolesByNames(payload.roleNames))
      .then((roles) => this.userModel.create({
        login: payload.login,
        password: hashSync(payload.password, 10),
        firstName: payload.firstName,
        lastName: payload.lastName,
        surname: payload.surname ?? null
      })
        .then((user) => Promise.all(roles.map((role) => this.userRoleModel.create({
          userUid: user.uid,
          roleUid: role.uid
        })))
          .then((userRoles) => {
            user.roles = userRoles.map((userRole, index) => {
              userRole.role = roles[index]
              return userRole
            })

            return this.toPublicUserDto(user)
          })))
  }

  private assertLoginAvailable(login: string): Promise<void> {
    return this.userModel.findOne({ where: { login } })
      .then((user) => {
        if (user) {
          throw new Exceptions.ServiceError.ConflictError("Пользователь с таким логином уже существует")
        }
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
}
