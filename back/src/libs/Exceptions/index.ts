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
  constructor(message = 'Bad Request', details?: ExceptionDetails) {
    super(message, 400, details)
  }
}

class MissingValidatorError extends AppError {
  constructor(message = 'Payload validator scheme is missing', details?: ExceptionDetails) {
    super(message, 'httpServer', details)
  }
}

class UnauthorizedError extends HttpServerError {
  constructor(message = 'Unauthorized', details?: ExceptionDetails) {
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
  constructor(message = 'Token is missing', details?: ExceptionDetails) {
    super(message, 'token_missing', details)
  }
}

class MalformedTokenError extends AuthenticationError {
  constructor(message = 'Token is malformed', details?: ExceptionDetails) {
    super(message, 'token_malformed', details)
  }
}

class ExpiredTokenError extends AuthenticationError {
  constructor(message = 'Token is expired', details?: ExceptionDetails) {
    super(message, 'token_expired', details)
  }
}

class InvalidTokenSignatureError extends AuthenticationError {
  constructor(message = 'Token signature is invalid', details?: ExceptionDetails) {
    super(message, 'token_signature_invalid', details)
  }
}

class InvalidTokenClaimsError extends AuthenticationError {
  constructor(message = 'Token claims are invalid', details?: ExceptionDetails) {
    super(message, 'token_claims_invalid', details)
  }
}

class TokenVerificationError extends AuthenticationError {
  constructor(message = 'Token verification failed', details?: ExceptionDetails) {
    super(message, 'token_verification_failed', details)
  }
}

class RouteNotFoundError extends HttpServerError {
  constructor(message = 'Route Not Found', details?: ExceptionDetails) {
    super(message, 404, details)
  }
}

class PayloadValidationError extends HttpServerError {
  constructor(message = 'Payload Validation Failed', details?: ExceptionDetails) {
    super(message, 422, details)
  }
}

class InternalServerError extends HttpServerError {
  constructor(message = 'Internal Server Error', details?: ExceptionDetails) {
    super(message, 500, details)
  }
}

class AccessDeniedError extends AppError {
  constructor(message = 'Access Denied', details?: ExceptionDetails) {
    super(message, 'controller', details)
  }
}

class ControllerUnauthorizedError extends AppError {
  constructor(message = 'Unauthorized', details?: ExceptionDetails) {
    super(message, 'controller', details)
  }
}

class ControllerNotFoundError extends AppError {
  constructor(message = 'Not Found', details?: ExceptionDetails) {
    super(message, 'controller', details)
  }
}

class ControllerConflictError extends AppError {
  constructor(message = 'Conflict', details?: ExceptionDetails) {
    super(message, 'controller', details)
  }
}

class ControllerInternalError extends AppError {
  constructor(message = 'Internal Error', details?: ExceptionDetails) {
    super(message, 'controller', details)
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Entity Not Found', details?: ExceptionDetails) {
    super(message, 'service', details)
  }
}

class ServiceAuthenticationError extends AppError {
  constructor(message = 'Authentication Failed', details?: ExceptionDetails) {
    super(message, 'service', details)
  }
}

class ConflictError extends AppError {
  constructor(message = 'Conflict', details?: ExceptionDetails) {
    super(message, 'service', details)
  }
}

class InternalError extends AppError {
  constructor(message = 'Internal Error', details?: ExceptionDetails) {
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
