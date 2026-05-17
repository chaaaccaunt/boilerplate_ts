import { IncomingMessage, ServerResponse, IncomingHttpHeaders } from "http";
import { iHTTPConfig } from "..";
import { JsonWebTokenError, JwtPayload, NotBeforeError, TokenExpiredError, verify } from "jsonwebtoken";
import { Exceptions } from "../../Exceptions";
import { PayloadValidator } from "../../Validator";

export class HTTPMiddlewares {
  constructor(private env: iHTTPConfig, private exceptions: typeof Exceptions.HttpServerError) { }

  private getCookieNameRegExp() {
    return new RegExp(`^${this.escapeRegExp(this.env.cookie_name)}=`)
  }

  private escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  }

  private verifyToken(headers: IncomingHttpHeaders): iContracts.iUserToken {
    if (!headers.cookie || !headers.cookie.length) {
      throw new this.exceptions.MissingTokenError("Запрос без куки")
    }

    const cookies = headers.cookie.split(";")
    const cookieNameRegExp = this.getCookieNameRegExp()
    const exist = cookies.find((c) => cookieNameRegExp.test(c.trim()))

    if (!exist || !exist.length) {
      throw new this.exceptions.MissingTokenError("В запросе отсутствует ожидаемая куки")
    }

    try {
      const token = exist.trim().split("=")[1]

      if (!token?.length) {
        throw new this.exceptions.MissingTokenError("Пустая куки авторизации")
      }

      const verifyOptions: { audience?: string, issuer?: string } = {}

      if (this.env.jwt_audience) verifyOptions.audience = this.env.jwt_audience
      if (this.env.jwt_issuer) verifyOptions.issuer = this.env.jwt_issuer

      const valid = verify(token, this.env.jwt_secret, verifyOptions)
      if (!this.isUserToken(valid)) {
        throw new this.exceptions.InvalidTokenClaimsError("Некорректные данные токена доступа")
      }

      return valid
    } catch (error) {
      if (error instanceof this.exceptions.AuthenticationError) {
        throw error
      }

      if (error instanceof TokenExpiredError) {
        throw new this.exceptions.ExpiredTokenError("Срок действия токена доступа истек", { cause: error })
      }

      if (error instanceof NotBeforeError) {
        throw new this.exceptions.InvalidTokenClaimsError("Токен доступа еще не активен", { cause: error })
      }

      if (error instanceof JsonWebTokenError) {
        if (error.message === "invalid signature") {
          throw new this.exceptions.InvalidTokenSignatureError("Некорректная подпись токена доступа", { cause: error })
        }

        if (error.message === "jwt malformed" || error.message === "invalid token") {
          throw new this.exceptions.MalformedTokenError("Некорректный формат токена доступа", { cause: error })
        }

        throw new this.exceptions.TokenVerificationError("Не удалось проверить токен доступа", { cause: error })
      }

      throw new this.exceptions.TokenVerificationError("Не удалось проверить токен доступа", { cause: error })
    }
  }

  private isUserToken(payload: string | JwtPayload): payload is iContracts.iUserToken {
    if (typeof payload !== "object" || payload === null) return false
    if (typeof payload.uid !== "string") return false
    if (payload.claims !== undefined && !this.isPayload(payload.claims)) return false

    return true
  }

  private isPayload(value: unknown): value is iContracts.iPayload {
    return typeof value === "object" && value !== null && !Array.isArray(value)
  }

  httpTokenValidator(request: IncomingMessage, response: ServerResponse): { message: string, status: number } | void {
    request.user = this.verifyToken(request.headers)
  }

  payloadValidator(request: IncomingMessage, response: ServerResponse): { message: string, status: number } | void {
    if (!request.scheme) throw new this.exceptions.MissingValidatorError()
    const { error, message } = PayloadValidator.validator(request.body, request.scheme)
    if (error) return { message, status: 422 }

  }
}
