import { compareSync } from "bcryptjs"
import { sign } from "jsonwebtoken"
import { Exceptions } from "@/libs"

export class AuthorizationService {
  constructor(
    private readonly model: iDatabase.Models["User"],
    private readonly httpConfig: iLibs.iHTTPConfig
  ) { }

  login(payload: iAuthorization.iLoginPayload): Promise<iAuthorization.iLoginResult> {
    return this.model.findOne({
      where: { login: payload.login },
      include: [{
        association: this.model.associations.roles,
        include: [{ association: "role" }]
      }]
    })
      .then((user) => {
        if (!user || !compareSync(payload.password, user.password)) {
          throw new Exceptions.ServiceError.AuthenticationError("Неверный логин или пароль")
        }

        return this.createLoginResult(user)
      })
  }

  private createLoginResult(user: iDatabase.Models["User"]["prototype"]): iAuthorization.iLoginResult {
    const signOptions: { audience?: string, issuer?: string } = {}

    if (this.httpConfig.jwt_audience) signOptions.audience = this.httpConfig.jwt_audience
    if (this.httpConfig.jwt_issuer) signOptions.issuer = this.httpConfig.jwt_issuer

    const roles = user.roles.map((userRole) => ({
      uid: userRole.role.uid,
      name: userRole.role.name
    } satisfies iSharedUserRole.UserRoleDto))

    const userDto = {
      uid: user.uid,
      login: user.login,
      firstName: user.firstName,
      lastName: user.lastName,
      surname: user.surname,
      fullName: user.fullName,
      roles
    } satisfies iSharedAuthorization.LoginResponseDto

    const tokenPayload: iContracts.iUserToken = {
      uid: user.uid,
      claims: {
        roles: roles.map((role) => role.name)
      }
    }

    return {
      user: userDto,
      accessToken: sign(tokenPayload, this.httpConfig.jwt_secret, signOptions)
    }
  }
}
