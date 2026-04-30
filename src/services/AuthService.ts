import { timingSafeEqual } from "crypto"
import { sign } from "jsonwebtoken"
import { Exceptions } from "@/libs/Exceptions"
import { iHTTPConfig } from "@/libs/HTTPServer"

export class AuthService {
  constructor(
    private readonly model: iDatabase.Models["User"],
    private readonly httpConfig: iHTTPConfig
  ) { }

  async login(payload: iAuth.iLoginPayload): Promise<iAuth.iLoginResult> {
    const user = await this.model.findOne({ where: { login: payload.login } })

    if (!user || !this.passwordsMatch(payload.password, user.password)) {
      throw new Exceptions.ServiceError.AuthenticationError("Invalid login or password")
    }

    const tokenPayload: iContracts.iUserToken = {
      uid: user.uid,
      roles: []
    }
    const signOptions: { audience?: string, issuer?: string } = {}

    if (this.httpConfig.jwt_audience) signOptions.audience = this.httpConfig.jwt_audience
    if (this.httpConfig.jwt_issuer) signOptions.issuer = this.httpConfig.jwt_issuer

    return {
      user: {
        uid: user.uid,
        login: user.login,
        firstName: user.firstName,
        lastName: user.lastName,
        surname: user.surname,
        fullName: user.fullName
      },
      accessToken: sign(tokenPayload, this.httpConfig.jwt_secret, signOptions)
    }
  }

  async logout(): Promise<void> { }

  private passwordsMatch(input: string, stored: string): boolean {
    const inputBuffer = Buffer.from(input)
    const storedBuffer = Buffer.from(stored)

    if (inputBuffer.length !== storedBuffer.length) return false
    return timingSafeEqual(inputBuffer, storedBuffer)
  }
}
