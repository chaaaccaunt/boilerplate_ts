import { Exceptions } from "../Exceptions"

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'
export type TraceLayer = 'httpServer' | 'controller' | 'service'

export interface iLoggerEnv {
  VAR_APP_LOG_LEVEL?: LogLevel
}

type LogValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | LogValue[]
  | { [key: string]: LogValue }
  | Error

interface LogContext {
  requestId?: string
  userId?: string | number
  functionName?: string
  event?: string
  stack?: string[]
  durationMs?: number
  status?: number
  method?: string
  path?: string
  payload?: LogValue
  result?: LogValue
  reason?: string
  error?: LogValue
  trace?: unknown
  controllerName?: string
  controllerMethod?: string
  serviceName?: string
  serviceMethod?: string
}

interface LogRecord {
  timestamp: string
  level: LogLevel
  message: string
  context: LogContext
}

export class Logger {
  #debugEnabled = process.env.VAR_APP_LOG_LEVEL === 'debug'

  constructor() { }

  log(level: LogLevel, message: string, context: LogContext = {}): void {
    if (level === 'debug' && !this.#debugEnabled) {
      return
    }

    const record: LogRecord = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: this.#sanitizeContext(context)
    }

    console.log(record)
  }

  debug(message: string, context: LogContext = {}): void {
    this.log('debug', message, context)
  }

  info(message: string, context: LogContext = {}): void {
    this.log('info', message, context)
  }

  warn(message: string, context: LogContext = {}): void {
    this.log('warn', message, context)
  }

  error(message: string, context: LogContext = {}): void {
    this.log('error', message, context)
  }

  #sanitizeContext(context: LogContext): LogContext {
    const next: LogContext = { ...context }

    if (next.payload !== undefined) {
      next.payload = this.#sanitizeValue(next.payload)
    }

    if (next.result !== undefined) {
      next.result = this.#sanitizeValue(next.result)
    }

    if (next.error !== undefined) {
      next.error = this.#sanitizeValue(next.error)
    }

    if (next.trace !== undefined) {
      next.trace = this.#sanitizeValue(next.trace)
    }

    return next
  }

  #sanitizeValue(value: unknown): LogValue {
    if (value instanceof Error) {
      return {
        name: value.name,
        message: value.message
      }
    }

    if (value === null || value === undefined) {
      return value
    }

    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return value
    }

    if (Array.isArray(value)) {
      return value.map(item => this.#sanitizeValue(item))
    }

    if (this.#isLogObject(value)) {
      const source = value
      const result: Record<string, LogValue> = {}

      for (const key of Object.keys(source)) {
        const lowered = key.toLowerCase()

        if (
          lowered.includes('password') ||
          lowered.includes('token') ||
          lowered.includes('cookie') ||
          lowered.includes('secret') ||
          lowered.includes('authorization')
        ) {
          result[key] = '[REDACTED]'
          continue
        }

        result[key] = this.#sanitizeValue(source[key])
      }

      return result
    }

    throw new TypeError(`Unsupported log value type: ${typeof value}`)
  }

  #isLogObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null
  }
}

interface TraceStep {
  layer: TraceLayer
  level: LogLevel
  event: string
  functionName: string
  stack: string[]
  durationMs: number
  status?: number
  reason?: string
  payload?: LogValue
  error?: LogValue
  controllerName?: string
  controllerMethod?: string
  serviceName?: string
  serviceMethod?: string
}

interface TraceState {
  steps: TraceStep[]
}

export class TraceContext {
  #stack: string[]
  #state: TraceState

  constructor(state: TraceState = { steps: [] }, stack: string[] = []) {
    this.#state = state
    this.#stack = stack.slice()
  }

  next(name: string): TraceContext {
    return new TraceContext(this.#state, this.#stack.concat(name))
  }

  getStack(): string[] {
    return this.#stack.slice()
  }

  addStep(step: Omit<TraceStep, 'stack'>): void {
    this.#state.steps.push({
      ...step,
      stack: this.getStack()
    })
  }

  getTrace(): TraceStep[] {
    return this.#state.steps.map((step) => ({
      ...step,
      stack: step.stack.slice()
    }))
  }
}

export class MethodTracer {
  constructor(private logger?: Logger) { }

  trace<T>(
    traceContext: TraceContext,
    layer: TraceLayer,
    functionName: string,
    level: LogLevel,
    fn: (nextContext: TraceContext) => Promise<T>,
    context: Omit<LogContext, 'functionName' | 'stack' | 'durationMs' | 'error'> = {}
  ): Promise<T> {
    const nextContext = traceContext.next(functionName)
    const startedAt = Date.now()

    return fn(nextContext)
      .then((result: T) => {
        nextContext.addStep({
          layer,
          level,
          event: context.event || 'method completed',
          functionName,
          durationMs: Date.now() - startedAt,
          status: context.status,
          reason: context.reason,
          payload: context.payload,
          controllerName: context.controllerName,
          controllerMethod: context.controllerMethod,
          serviceName: context.serviceName,
          serviceMethod: context.serviceMethod
        })

        return result
      })
      .catch((error: Error) => {
        const normalizedError = this.#normalizeError(error, layer)

        nextContext.addStep({
          layer,
          level: 'error',
          event: context.event || 'method failed',
          functionName,
          durationMs: Date.now() - startedAt,
          status: context.status,
          reason: context.reason,
          payload: context.payload,
          error: normalizedError,
          controllerName: context.controllerName,
          controllerMethod: context.controllerMethod,
          serviceName: context.serviceName,
          serviceMethod: context.serviceMethod
        })

        throw normalizedError
      })
  }

  #normalizeError(error: unknown, layer: TraceLayer): Error {
    if (
      error instanceof Exceptions.HttpServerError.BadRequestError ||
      error instanceof Exceptions.HttpServerError.MissingValidatorError ||
      error instanceof Exceptions.HttpServerError.UnauthorizedError ||
      error instanceof Exceptions.HttpServerError.AuthenticationError ||
      error instanceof Exceptions.HttpServerError.RouteNotFoundError ||
      error instanceof Exceptions.HttpServerError.PayloadValidationError ||
      error instanceof Exceptions.HttpServerError.InternalServerError ||
      error instanceof Exceptions.ControllerError.AccessDeniedError ||
      error instanceof Exceptions.ControllerError.UnauthorizedError ||
      error instanceof Exceptions.ControllerError.NotFoundError ||
      error instanceof Exceptions.ControllerError.ConflictError ||
      error instanceof Exceptions.ControllerError.InternalError ||
      error instanceof Exceptions.ServiceError.AuthenticationError ||
      error instanceof Exceptions.ServiceError.NotFoundError ||
      error instanceof Exceptions.ServiceError.ConflictError ||
      error instanceof Exceptions.ServiceError.InternalError
    ) {
      return error
    }

    if (error instanceof Error) {
        if (layer === 'controller') {
          return new Exceptions.ControllerError.InternalError(error.message, { cause: error })
        }

        if (layer === 'httpServer') {
          return error
        }

        return new Exceptions.ServiceError.InternalError(error.message, { cause: error })
      }

    if (layer === 'controller') {
      return new Exceptions.ControllerError.InternalError('Controller threw a non-Error value', { cause: error })
    }

    if (layer === 'httpServer') {
      return new Exceptions.HttpServerError.InternalServerError('HttpServer threw a non-Error value', { cause: error })
    }

    return new Exceptions.ServiceError.InternalError('Service threw a non-Error value', { cause: error })
  }
}
