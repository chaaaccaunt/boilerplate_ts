import { PayloadValidator } from "@/libs";
import { IncomingMessage, ServerResponse, IncomingHttpHeaders } from "http";
import { iHTTPConfig } from "..";
import { JsonWebTokenError, JwtPayload, NotBeforeError, TokenExpiredError, verify } from "jsonwebtoken";
import { Exceptions } from "@/libs/Exceptions";

export class HTTPMiddlewares {

  constructor(private env: iHTTPConfig, private exceptions: typeof Exceptions.HttpServerError) { }

  private getCookieNameRegExp() {
    return new RegExp(`^${this.env.cookie_name}=`)
  }

  private verifyToken(headers: IncomingHttpHeaders): iContracts.iUserToken {
    if (!headers.cookie || !headers.cookie.length) {
      throw new this.exceptions.MissingTokenError("Request without cookie")
    }

    const cookies = headers.cookie.split(";")
    const cookieNameRegExp = this.getCookieNameRegExp()
    const exist = cookies.find((c) => cookieNameRegExp.test(c.trim()))

    if (!exist || !exist.length) {
      throw new this.exceptions.MissingTokenError("Request without expected cookie")
    }

    try {
      const token = exist.trim().split("=")[1]

      if (!token?.length) {
        throw new this.exceptions.MissingTokenError("Empty auth cookie")
      }

      const verifyOptions: { audience?: string, issuer?: string } = {}

      if (this.env.jwt_audience) verifyOptions.audience = this.env.jwt_audience
      if (this.env.jwt_issuer) verifyOptions.issuer = this.env.jwt_issuer

      const valid = verify(token, this.env.jwt_secret, verifyOptions)
      if (!this.isUserToken(valid)) {
        throw new this.exceptions.InvalidTokenClaimsError("Access token payload is invalid")
      }

      return valid
    } catch (error) {
      if (error instanceof this.exceptions.AuthenticationError) {
        throw error
      }

      if (error instanceof TokenExpiredError) {
        throw new this.exceptions.ExpiredTokenError("Access token expired", { cause: error })
      }

      if (error instanceof NotBeforeError) {
        throw new this.exceptions.InvalidTokenClaimsError("Access token is not active yet", { cause: error })
      }

      if (error instanceof JsonWebTokenError) {
        if (error.message === "invalid signature") {
          throw new this.exceptions.InvalidTokenSignatureError("Access token signature is invalid", { cause: error })
        }

        if (error.message === "jwt malformed" || error.message === "invalid token") {
          throw new this.exceptions.MalformedTokenError("Access token is malformed", { cause: error })
        }

        throw new this.exceptions.TokenVerificationError("Access token verification failed", { cause: error })
      }

      throw new this.exceptions.TokenVerificationError("Access token verification failed", { cause: error })
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
