import { Exceptions } from "../Exceptions"
import { Socket, createConnection } from "net"
import { RuntimeMetrics } from "../RuntimeMetrics"

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'
export type TraceLayer = 'httpServer' | 'webSocketServer' | 'controller' | 'gateway' | 'service'

export interface iLoggerEnv {
  VAR_APP_LOG_LEVEL?: LogLevel
  VAR_LOG_COLLECTOR_SOCKET_HOST?: string
  VAR_LOG_COLLECTOR_SOCKET_PORT?: string
  VAR_PACKAGE_UID?: string
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
  connectionId?: string
  packageUid?: string
  source?: string
  requestId?: string
  userId?: string | number
  sessionUid?: string
  functionName?: string
  event?: string
  stack?: string[]
  durationMs?: number
  status?: number
  method?: string
  path?: string
  payload?: LogValue
  result?: LogValue
  sql?: string
  mutation?: boolean
  ipAddress?: string | null
  userAgent?: string | null
  deviceType?: string
  operatingSystem?: string
  browser?: string
  socketId?: string
  remoteAddress?: string | null
  remotePort?: number | null
  reason?: string
  error?: LogValue
  trace?: unknown
  controllerName?: string
  controllerMethod?: string
  gatewayName?: string
  gatewayEvent?: string
  serviceName?: string
  serviceMethod?: string
}

interface LogRecord {
  timestamp: string
  kind: iSharedLogs.LogKind
  level: LogLevel
  source: string
  message: string
  context: LogContext
}

interface MetricsRequestMessage {
  collectorMessageType: "metrics_request"
  requestId: string
}

interface PackageAuthenticationMessage {
  collectorMessageType: "package_authentication"
  packageUid: string
}

interface MetricsResponseMessage {
  collectorMessageType: "metrics_response"
  requestId: string
  source: string
  metrics: iSharedSystem.RuntimeMetricsDto
}

interface LogSink {
  send(record: LogRecord): void
}

class NoopLogSink implements LogSink {
  send(): void {}
}

class ConsoleLogSink implements LogSink {
  send(record: LogRecord): void {
    console.log({
      timestamp: record.timestamp,
      kind: record.kind,
      level: record.level,
      source: record.source,
      message: record.message,
      context: record.context
    })
  }
}

class CompositeLogSink implements LogSink {
  constructor(private readonly sinks: LogSink[]) {}

  send(record: LogRecord): void {
    this.sinks.forEach((sink) => sink.send(record))
  }
}

interface LoggerOptions {
  sink?: LogSink
  source?: string
}

type LogWriter = (message: string, context?: LogContext) => void

class LogCollectorClient implements LogSink {
  private readonly maxConnectionAttempts = 10
  private readonly retryDelayMs = 5000
  private readonly connectTimeoutMs = 1000
  private readonly maxQueueSize = 500
  private socket: Socket | null = null
  private readonly queue: string[] = []
  private connecting = false
  private connectionAttempts = 0
  private disabled = false
  private failureReported = false
  private connectedOnce = false
  private inputBuffer = ""
  private readonly metrics = new RuntimeMetrics()
  send: (record: LogRecord) => void = this.enqueue.bind(this)

  constructor(
    private readonly host: string,
    private readonly port: string,
    private readonly packageUid: string
  ) {
    this.assertConfigured()
  }

  private enqueue(record: LogRecord): void {
    this.queue.push(`${JSON.stringify(record)}\n`)
    if (this.queue.length > this.maxQueueSize) {
      this.queue.shift()
    }

    this.flush()
  }

  private assertConfigured(): void {
    const port = Number(this.port)
    if (!this.host) throw new Error("Не задан VAR_LOG_COLLECTOR_SOCKET_HOST для подключения к log collector")
    if (!Number.isSafeInteger(port) || port <= 0) throw new Error("VAR_LOG_COLLECTOR_SOCKET_PORT должен быть положительным числом")
    if (!this.packageUid) throw new Error("VAR_PACKAGE_UID обязателен для подключения к log collector")
  }

  private flush(): void {
    if (this.socket?.writable) {
      while (this.queue.length) {
        const payload = this.queue.shift()
        if (payload) this.socket.write(payload)
      }
      return
    }

    if (this.connecting) return
    this.connect()
  }

  private connect(): void {
    const port = Number(this.port)
    if (this.connectionAttempts >= this.maxConnectionAttempts) {
      this.disable()
      return
    }

    this.connecting = true
    this.connectionAttempts += 1
    const socket = createConnection({ host: this.host, port, family: 4 })
    let failed = false
    socket.setTimeout(this.connectTimeoutMs)

    socket.setEncoding("utf8")

    socket.on("connect", () => {
      this.socket = socket
      this.connecting = false
      this.connectedOnce = true
      this.connectionAttempts = 0
      this.failureReported = false
      socket.setTimeout(0)
      this.queue.unshift(`${JSON.stringify(this.createLifecycleRecord("collector_connection", "info", "Подключение к log collector установлено"))}\n`)
      this.queue.unshift(`${JSON.stringify(this.createAuthenticationMessage())}\n`)
      this.flush()
    })

    socket.on("data", (chunk) => {
      this.handleData(socket, chunk.toString())
    })

    socket.on("timeout", () => {
      failed = true
      socket.destroy()
    })

    socket.on("error", () => {
      failed = true
    })

    socket.on("close", () => {
      if (this.socket === socket) this.socket = null
      this.connecting = false
      if (failed || this.connectedOnce) this.scheduleRetry()
    })
  }

  private scheduleRetry(): void {
    if (this.disabled) return

    if (this.connectionAttempts >= this.maxConnectionAttempts) {
      this.disable()
      return
    }

    const retryTimer = setTimeout(() => this.flush(), this.retryDelayMs)
    retryTimer.unref?.()
  }

  private disable(reason?: string): void {
    this.disabled = true
    this.send = () => {}
    this.queue.length = 0

    if (this.failureReported) return
    this.failureReported = true
    console.warn(reason || `Не удалось подключиться к log collector ${this.host}:${this.port} после ${this.maxConnectionAttempts} попыток. Приложение продолжит работу без отправки логов.`)
  }

  private handleData(socket: Socket, chunk: string): void {
    this.inputBuffer += chunk
    const lines = this.inputBuffer.split("\n")
    this.inputBuffer = lines.pop() || ""

    lines
      .map((line) => line.trim())
      .filter(Boolean)
      .forEach((line) => this.handleLine(socket, line))
  }

  private handleLine(socket: Socket, line: string): void {
    let message: MetricsRequestMessage

    try {
      message = JSON.parse(line) as MetricsRequestMessage
    } catch {
      return
    }

    if (message.collectorMessageType !== "metrics_request" || !message.requestId) return

    const response: MetricsResponseMessage = {
      collectorMessageType: "metrics_response",
      requestId: message.requestId,
      source: this.getSource(),
      metrics: this.metrics.collect(this.getSource(), this.packageUid)
    }

    socket.write(`${JSON.stringify(response)}\n`)
  }

  private createLifecycleRecord(kind: iSharedLogs.LogKind, level: LogLevel, message: string): LogRecord {
    return {
      timestamp: new Date().toISOString(),
      kind,
      level,
      source: this.getSource(),
      message,
      context: {
        serviceName: "LogCollectorClient",
        serviceMethod: "connect"
      }
    }
  }

  private createAuthenticationMessage(): PackageAuthenticationMessage {
    return {
      collectorMessageType: "package_authentication",
      packageUid: this.packageUid || ""
    }
  }

  private getSource(): string {
    return this.packageUid || "unknown-package"
  }
}

let sharedLogSink: LogSink | null = null

export class Logger {
  #debugEnabled = process.env.VAR_APP_LOG_LEVEL === "debug"
  #source: string
  #writers: Record<LogLevel, LogWriter>
  #sink: LogSink

  constructor(options: LoggerOptions = {}) {
    this.#source = options.source || process.env.VAR_PACKAGE_UID || "unknown-package"
    this.#sink = options.sink || getSharedLogSink()
    this.#writers = this.createWriters()
  }

  static createLocal(): Logger {
    return new Logger({ sink: new ConsoleLogSink() })
  }

  log(level: LogLevel, message: string, context: LogContext = {}): void {
    this.#writers[level](message, context)
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

  isDebugEnabled(): boolean {
    return this.#debugEnabled
  }

  private createWriters(): Record<LogLevel, LogWriter> {
    const writeDebug = this.#debugEnabled ? this.write.bind(this, "debug") : () => undefined

    return {
      debug: writeDebug,
      info: this.write.bind(this, "info"),
      warn: this.write.bind(this, "warn"),
      error: this.write.bind(this, "error")
    }
  }

  private write(level: LogLevel, message: string, context: LogContext = {}): void {
    this.#sink.send({
      timestamp: new Date().toISOString(),
      kind: "application",
      level,
      source: this.#source,
      message,
      context: this.#sanitizeContext(context)
    })
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

    throw new TypeError(`Неподдерживаемый тип значения для лога: ${typeof value}`)
  }

  #isLogObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null
  }

}

function createDefaultLogSink(): LogSink {
  const consoleSink = new ConsoleLogSink()
  const collectorSink = createCollectorSinkFromEnv()

  if (collectorSink instanceof NoopLogSink) return consoleSink

  return new CompositeLogSink([consoleSink, collectorSink])
}

function getSharedLogSink(): LogSink {
  if (!sharedLogSink) {
    sharedLogSink = createDefaultLogSink()
  }

  return sharedLogSink
}

function createCollectorSinkFromEnv(): LogSink {
  const host = process.env.VAR_LOG_COLLECTOR_SOCKET_HOST
  const port = process.env.VAR_LOG_COLLECTOR_SOCKET_PORT

  if (!host && !port) return new NoopLogSink()
  if (!host || !port) throw new Error("Для подключения к log collector должны быть заданы VAR_LOG_COLLECTOR_SOCKET_HOST и VAR_LOG_COLLECTOR_SOCKET_PORT")

  return new LogCollectorClient(host, port, process.env.VAR_PACKAGE_UID || "")
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
  gatewayName?: string
  gatewayEvent?: string
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
          event: context.event || 'метод завершил работу',
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
          event: context.event || 'метод завершился ошибкой',
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
      return new Exceptions.ControllerError.InternalError('Контроллер выбросил значение, не являющееся ошибкой', { cause: error })
    }

    if (layer === 'httpServer') {
      return new Exceptions.HttpServerError.InternalServerError('HTTP-сервер выбросил значение, не являющееся ошибкой', { cause: error })
    }

    return new Exceptions.ServiceError.InternalError('Сервис выбросил значение, не являющееся ошибкой', { cause: error })
  }
}
