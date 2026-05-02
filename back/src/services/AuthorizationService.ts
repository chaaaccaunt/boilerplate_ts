import { timingSafeEqual } from "crypto"
import { sign } from "jsonwebtoken"
import { Exceptions } from "@/libs"

export class AuthorizationService {
  constructor(
    private readonly model: iDatabase.Models["User"],
    private readonly httpConfig: iLibs.iHTTPConfig
  ) { }

  async login(payload: iAuthorization.iLoginPayload): Promise<iAuthorization.iLoginResult> {
    const user = await this.model.findOne({
      where: { login: payload.login },
      include: [{ association: this.model.associations.roles }]
    })

    if (!user || !this.passwordsMatch(payload.password, user.password)) {
      throw new Exceptions.ServiceError.AuthenticationError("Неверный логин или пароль")
    }

    const signOptions: { audience?: string, issuer?: string } = {}

    if (this.httpConfig.jwt_audience) signOptions.audience = this.httpConfig.jwt_audience
    if (this.httpConfig.jwt_issuer) signOptions.issuer = this.httpConfig.jwt_issuer

    const roles = user.roles.map((role) => ({
      uid: role.uid,
      name: role.name
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

  private passwordsMatch(input: string, stored: string): boolean {
    const inputBuffer = Buffer.from(input)
    const storedBuffer = Buffer.from(stored)

    if (inputBuffer.length !== storedBuffer.length) return false
    return timingSafeEqual(inputBuffer, storedBuffer)
  }
}

