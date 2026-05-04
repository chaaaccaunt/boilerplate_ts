import { IncomingHttpHeaders } from "http"
import { JsonWebTokenError, JwtPayload, NotBeforeError, TokenExpiredError, verify } from "jsonwebtoken"
import { ExtendedError, Socket } from "socket.io"
import { Exceptions } from "../../Exceptions"
import { PayloadValidator } from "../../Validator"
import { iWebSocketConfig } from "../types"

export class WebSocketMiddlewares {
  constructor(
    private readonly config: iWebSocketConfig,
    private readonly exceptions = Exceptions.HttpServerError
  ) { }

  validateConnectionToken(socket: Socket, next: (error?: ExtendedError) => void): void {
    try {
      socket.data.user = this.verifyToken(socket.handshake.headers)
      next()
    } catch (error) {
      next(this.normalizeConnectionError(error))
    }
  }

  validatePayload(payload: unknown, scheme: iContracts.iScheme): { message: string } | null {
    if (!this.isPayload(payload)) {
      return { message: "Некорректные данные события WebSocket" }
    }

    const { error, message } = PayloadValidator.validator(payload, scheme)
    if (error) return { message }

    return null
  }

  private verifyToken(headers: IncomingHttpHeaders): iContracts.iUserToken {
    if (!headers.cookie || !headers.cookie.length) {
      throw new this.exceptions.MissingTokenError("WebSocket подключение без cookie авторизации")
    }

    const cookies = headers.cookie.split(";")
    const cookieNameRegExp = this.getCookieNameRegExp()
    const exist = cookies.find((cookie) => cookieNameRegExp.test(cookie.trim()))

    if (!exist || !exist.length) {
      throw new this.exceptions.MissingTokenError("В WebSocket подключении отсутствует ожидаемая cookie авторизации")
    }

    try {
      const token = exist.trim().split("=")[1]

      if (!token?.length) {
        throw new this.exceptions.MissingTokenError("Пустая cookie авторизации")
      }

      const verifyOptions: { audience?: string, issuer?: string } = {}

      if (this.config.jwt_audience) verifyOptions.audience = this.config.jwt_audience
      if (this.config.jwt_issuer) verifyOptions.issuer = this.config.jwt_issuer

      const valid = verify(token, this.config.jwt_secret, verifyOptions)
      if (!this.isUserToken(valid)) {
        throw new this.exceptions.InvalidTokenClaimsError("Некорректные данные токена доступа")
      }

      return valid
    } catch (error) {
      if (error instanceof this.exceptions.AuthenticationError) throw error
      if (error instanceof TokenExpiredError) throw new this.exceptions.ExpiredTokenError("Срок действия токена доступа истек", { cause: error })
      if (error instanceof NotBeforeError) throw new this.exceptions.InvalidTokenClaimsError("Токен доступа еще не активен", { cause: error })
      if (error instanceof JsonWebTokenError) throw new this.exceptions.TokenVerificationError("Не удалось проверить токен доступа", { cause: error })

      throw new this.exceptions.TokenVerificationError("Не удалось проверить токен доступа", { cause: error })
    }
  }

  private normalizeConnectionError(error: unknown): ExtendedError {
    if (error instanceof Error) return error
    return new Error("Не удалось установить WebSocket подключение")
  }

  private getCookieNameRegExp(): RegExp {
    return new RegExp(`^${this.config.cookie_name}=`)
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
}
