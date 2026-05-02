export type ExceptionLayer = 'httpServer' | 'controller' | 'service'

export interface ExceptionDetails {
  reason?: string
  fields?: string[]
  cause?: unknown
}

abstract class AppError extends Error {
  readonly layer: ExceptionLayer
  readonly details?: ExceptionDetails

  constructor(message: string, layer: ExceptionLayer, details?: ExceptionDetails) {
    super(message)
    this.name = new.target.name
    this.layer = layer
    this.details = details
  }
}

abstract class HttpServerError extends AppError {
  readonly status: 400 | 401 | 404 | 422 | 500

  constructor(message: string, status: 400 | 401 | 404 | 422 | 500, details?: ExceptionDetails) {
    super(message, 'httpServer', details)
    this.status = status
  }
}

class BadRequestError extends HttpServerError {
  constructor(message = 'Некорректный запрос', details?: ExceptionDetails) {
    super(message, 400, details)
  }
}

class MissingValidatorError extends AppError {
  constructor(message = 'Отсутствует схема валидации данных запроса', details?: ExceptionDetails) {
    super(message, 'httpServer', details)
  }
}

class UnauthorizedError extends HttpServerError {
  constructor(message = 'Требуется авторизация', details?: ExceptionDetails) {
    super(message, 401, details)
  }
}

abstract class AuthenticationError extends UnauthorizedError {
  readonly reasonCode: string

  constructor(message: string, reasonCode: string, details?: ExceptionDetails) {
    super(message, details)
    this.name = new.target.name
    this.reasonCode = reasonCode
  }
}

class MissingTokenError extends AuthenticationError {
  constructor(message = 'Токен отсутствует', details?: ExceptionDetails) {
    super(message, 'token_missing', details)
  }
}

class MalformedTokenError extends AuthenticationError {
  constructor(message = 'Некорректный формат токена', details?: ExceptionDetails) {
    super(message, 'token_malformed', details)
  }
}

class ExpiredTokenError extends AuthenticationError {
  constructor(message = 'Срок действия токена истек', details?: ExceptionDetails) {
    super(message, 'token_expired', details)
  }
}

class InvalidTokenSignatureError extends AuthenticationError {
  constructor(message = 'Некорректная подпись токена', details?: ExceptionDetails) {
    super(message, 'token_signature_invalid', details)
  }
}

class InvalidTokenClaimsError extends AuthenticationError {
  constructor(message = 'Некорректные данные токена', details?: ExceptionDetails) {
    super(message, 'token_claims_invalid', details)
  }
}

class TokenVerificationError extends AuthenticationError {
  constructor(message = 'Не удалось проверить токен', details?: ExceptionDetails) {
    super(message, 'token_verification_failed', details)
  }
}

class RouteNotFoundError extends HttpServerError {
  constructor(message = 'Маршрут не найден', details?: ExceptionDetails) {
    super(message, 404, details)
  }
}

class PayloadValidationError extends HttpServerError {
  constructor(message = 'Ошибка валидации данных запроса', details?: ExceptionDetails) {
    super(message, 422, details)
  }
}

class InternalServerError extends HttpServerError {
  constructor(message = 'Внутренняя ошибка сервера', details?: ExceptionDetails) {
    super(message, 500, details)
  }
}

class AccessDeniedError extends AppError {
  constructor(message = 'Доступ запрещен', details?: ExceptionDetails) {
    super(message, 'controller', details)
  }
}

class ControllerUnauthorizedError extends AppError {
  constructor(message = 'Требуется авторизация', details?: ExceptionDetails) {
    super(message, 'controller', details)
  }
}

class ControllerNotFoundError extends AppError {
  constructor(message = 'Не найдено', details?: ExceptionDetails) {
    super(message, 'controller', details)
  }
}

class ControllerConflictError extends AppError {
  constructor(message = 'Конфликт данных', details?: ExceptionDetails) {
    super(message, 'controller', details)
  }
}

class ControllerInternalError extends AppError {
  constructor(message = 'Внутренняя ошибка', details?: ExceptionDetails) {
    super(message, 'controller', details)
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Сущность не найдена', details?: ExceptionDetails) {
    super(message, 'service', details)
  }
}

class ServiceAuthenticationError extends AppError {
  constructor(message = 'Ошибка аутентификации', details?: ExceptionDetails) {
    super(message, 'service', details)
  }
}

class ConflictError extends AppError {
  constructor(message = 'Конфликт данных', details?: ExceptionDetails) {
    super(message, 'service', details)
  }
}

class InternalError extends AppError {
  constructor(message = 'Внутренняя ошибка', details?: ExceptionDetails) {
    super(message, 'service', details)
  }
}

export const Exceptions = {
  HttpServerError: {
    BadRequestError,
    MissingValidatorError,
    UnauthorizedError,
    AuthenticationError,
    MissingTokenError,
    MalformedTokenError,
    ExpiredTokenError,
    InvalidTokenSignatureError,
    InvalidTokenClaimsError,
    TokenVerificationError,
    RouteNotFoundError,
    PayloadValidationError,
    InternalServerError,
    AccessDeniedError,
  },
  ControllerError: {
    AccessDeniedError,
    UnauthorizedError: ControllerUnauthorizedError,
    NotFoundError: ControllerNotFoundError,
    ConflictError: ControllerConflictError,
    InternalError: ControllerInternalError
  },
  ServiceError: {
    AuthenticationError: ServiceAuthenticationError,
    NotFoundError,
    ConflictError,
    InternalError
  }
}
