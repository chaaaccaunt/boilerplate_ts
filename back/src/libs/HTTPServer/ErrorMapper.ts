import { IncomingMessage } from "http"
import { Exceptions } from "../Exceptions"
import { LogLevel, Logger } from "../Logger"

export class HTTPErrorMapper {
  constructor(
    private readonly exceptions: typeof Exceptions.HttpServerError,
    private readonly logger: Logger
  ) { }

  normalize(error: unknown): Error {
    if (error instanceof Error && this.isMappedError(error)) return error
    if (error instanceof Error) return new this.exceptions.InternalServerError(error.message, { cause: error })
    return new this.exceptions.InternalServerError("Необработанная ошибка сервера", { cause: error })
  }

  getStatus(error: Error): number {
    if (error instanceof this.exceptions.BadRequestError) return 400
    if (error instanceof this.exceptions.UnauthorizedError) return 401
    if (error instanceof this.exceptions.RouteNotFoundError) return 404
    if (error instanceof this.exceptions.PayloadValidationError) return 422
    if (error instanceof this.exceptions.InternalServerError) return 500
    if (error instanceof Exceptions.ControllerError.UnauthorizedError) return 401
    if (error instanceof Exceptions.ControllerError.AccessDeniedError) return 403
    if (error instanceof Exceptions.ControllerError.NotFoundError) return 404
    if (error instanceof Exceptions.ControllerError.ConflictError) return 409
    if (error instanceof Exceptions.ControllerError.InternalError) return 500

    throw new this.exceptions.InternalServerError("Необработанная ошибка сервера", { cause: error })
  }

  getCode(error: Error): string {
    if (error instanceof this.exceptions.AuthenticationError) return `AUTHORIZATION_${error.reasonCode.toUpperCase()}`
    if (error instanceof this.exceptions.BadRequestError) return "BAD_REQUEST"
    if (error instanceof this.exceptions.RouteNotFoundError) return "ROUTE_NOT_FOUND"
    if (error instanceof this.exceptions.PayloadValidationError) return "PAYLOAD_VALIDATION_FAILED"
    if (error instanceof this.exceptions.InternalServerError) return "INTERNAL_ERROR"
    if (error instanceof Exceptions.ControllerError.UnauthorizedError) return "AUTHENTICATION_FAILED"
    if (error instanceof Exceptions.ControllerError.AccessDeniedError) return "ACCESS_DENIED"
    if (error instanceof Exceptions.ControllerError.NotFoundError) return "NOT_FOUND"
    if (error instanceof Exceptions.ControllerError.ConflictError) return "CONFLICT"
    if (error instanceof Exceptions.ControllerError.InternalError) return "INTERNAL_ERROR"

    return "INTERNAL_ERROR"
  }

  getMessage(error: Error): string {
    if (this.isInternalError(error)) return "Внутренняя ошибка сервера"
    return error.message
  }

  getLogLevel(status: number): LogLevel {
    if (status >= 500) return "error"
    if (status >= 400) return "warn"
    return "info"
  }

  logInternalError(error: Error, request: IncomingMessage, requestId: string, status: number): void {
    this.logger.error("Необработанная ошибка сервера", {
      requestId,
      method: request.method,
      path: request.url,
      status,
      error: {
        name: error.name,
        message: error.message,
        cause: this.getCauseMessage(error)
      }
    })
  }

  private isMappedError(error: Error): boolean {
    return (
      error instanceof this.exceptions.BadRequestError ||
      error instanceof this.exceptions.UnauthorizedError ||
      error instanceof this.exceptions.RouteNotFoundError ||
      error instanceof this.exceptions.PayloadValidationError ||
      error instanceof this.exceptions.InternalServerError ||
      error instanceof Exceptions.ControllerError.UnauthorizedError ||
      error instanceof Exceptions.ControllerError.AccessDeniedError ||
      error instanceof Exceptions.ControllerError.NotFoundError ||
      error instanceof Exceptions.ControllerError.ConflictError ||
      error instanceof Exceptions.ControllerError.InternalError
    )
  }

  private isInternalError(error: Error): boolean {
    return (
      error instanceof this.exceptions.InternalServerError ||
      error instanceof Exceptions.ControllerError.InternalError
    )
  }

  private getCauseMessage(error: Error): string | null {
    const details = "details" in error ? error.details : null

    if (!this.isErrorDetails(details)) return null
    if (details.cause instanceof Error) return details.cause.message
    if (details.cause === undefined || details.cause === null) return null

    return String(details.cause)
  }

  private isErrorDetails(value: unknown): value is { cause?: unknown } {
    return typeof value === "object" && value !== null
  }
}
