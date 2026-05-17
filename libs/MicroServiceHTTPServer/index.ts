import { IncomingMessage, Server, ServerResponse, createServer } from "http"
import { Exceptions } from "../Exceptions"
import { Logger, LogLevel } from "../Logger"

export interface iMicroServiceHTTPConfig {
  port: string
  internalServiceToken: string
}

interface MicroServiceRequestContext {
  requestId: string
  route: iContracts.iMicroServiceRoute | null
}

interface NormalizedMicroServiceError {
  status: number
  code: string
  message: string
  error: Error
}

export class MicroServiceHTTPServer {
  private readonly jsonRequestBodyLimit = 1_000_000
  protected server: Server
  readonly routes: iContracts.iMicroServiceRoute[] = []

  constructor(readonly config: iMicroServiceHTTPConfig, private readonly logger = new Logger()) {
    this.server = createServer((request, response) => this.handleRequest(request, response))
  }

  private handleRequest(request: IncomingMessage, response: ServerResponse): void {
    const context: MicroServiceRequestContext = {
      requestId: "",
      route: null
    }

    Promise.resolve()
      .then(() => {
        context.requestId = this.getRequestId(request)
      })
      .then(() => this.resolveRoute(request, context))
      .then((route) => this.processRoute(request, response, route, context))
      .then((status) => this.logRequest(request, context, status))
      .catch((error) => this.finishRequestWithError(error, request, response, context))
  }

  private resolveRoute(request: IncomingMessage, context: MicroServiceRequestContext): iContracts.iMicroServiceRoute {
    const route = this.matchRoute(request)
    context.route = route
    return route
  }

  private processRoute(
    request: IncomingMessage,
    response: ServerResponse,
    route: iContracts.iMicroServiceRoute,
    context: MicroServiceRequestContext
  ): Promise<number> {
    this.assertPostRequest(request)
    this.assertInternalServiceToken(request)

    return this.readJsonRequestPayload(request)
      .then((payload) => route.callback({ requestId: context.requestId, data: payload }))
      .then((result) => {
        this.sendSuccess(response, 200, result)
        return 200
      })
  }

  private readJsonRequestPayload(request: IncomingMessage): Promise<iContracts.iPayload> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = []
      let size = 0

      request.on("data", (chunk: Buffer) => {
        size += chunk.length
        if (size > this.jsonRequestBodyLimit) {
          reject(new Exceptions.HttpServerError.BadRequestError("Размер запроса превышает допустимый лимит"))
          request.destroy()
          return
        }

        chunks.push(chunk)
      })

      request.on("end", () => {
        const body = Buffer.concat(chunks)

        if (!body.length) {
          resolve({})
          return
        }

        try {
          resolve(JSON.parse(body.toString("utf8")) as iContracts.iPayload)
        } catch (error) {
          reject(new Exceptions.HttpServerError.BadRequestError("Некорректный JSON в запросе", { cause: error }))
        }
      })

      request.on("error", (error) => {
        reject(new Exceptions.HttpServerError.BadRequestError("Не удалось прочитать запрос", { cause: error }))
      })
    })
  }

  private finishRequestWithError(
    error: unknown,
    request: IncomingMessage,
    response: ServerResponse,
    context: MicroServiceRequestContext
  ): void {
    const normalizedError = this.normalizeError(error)

    if (!request.readableEnded) {
      request.resume()
    }

    if (normalizedError.status >= 500) {
      this.logger.error("Микросервис завершил запрос с внутренней ошибкой", {
        requestId: context.requestId,
        method: request.method,
        path: request.url,
        status: normalizedError.status,
        error: normalizedError.error
      })
    }

    this.sendError(response, normalizedError.status, normalizedError.code, normalizedError.message)
    this.logRequest(request, context, normalizedError.status)
  }

  private normalizeError(error: unknown): NormalizedMicroServiceError {
    if (error instanceof Exceptions.HttpServerError.BadRequestError) {
      return {
        status: 400,
        code: "BAD_REQUEST",
        message: error.message,
        error
      }
    }

    if (error instanceof Exceptions.HttpServerError.RouteNotFoundError) {
      return {
        status: 404,
        code: "ROUTE_NOT_FOUND",
        message: error.message,
        error
      }
    }

    if (error instanceof Exceptions.HttpServerError.UnauthorizedError) {
      return {
        status: 401,
        code: "AUTHENTICATION_FAILED",
        message: error.message,
        error
      }
    }

    if (error instanceof Exceptions.ServiceError.NotFoundError) {
      return {
        status: 404,
        code: "NOT_FOUND",
        message: error.message,
        error
      }
    }

    if (error instanceof Exceptions.ServiceError.ConflictError) {
      return {
        status: 409,
        code: "CONFLICT",
        message: error.message,
        error
      }
    }

    if (error instanceof Exceptions.ServiceError.AuthenticationError) {
      return {
        status: 401,
        code: "AUTHENTICATION_FAILED",
        message: error.message,
        error
      }
    }

    if (error instanceof Error) {
      return {
        status: 500,
        code: "INTERNAL_ERROR",
        message: "Внутренняя ошибка сервиса",
        error
      }
    }

    return {
      status: 500,
      code: "INTERNAL_ERROR",
      message: "Внутренняя ошибка сервиса",
      error: new Exceptions.ServiceError.InternalError("Сервис выбросил значение, не являющееся ошибкой", { cause: error })
    }
  }

  private logRequest(request: IncomingMessage, context: MicroServiceRequestContext, status: number): void {
    const routeCallback = context.route?.callback

    this.logger.log(this.getLogLevel(status), "запрос микросервиса завершен", {
      requestId: context.requestId,
      method: request.method,
      path: request.url,
      status,
      serviceName: routeCallback?.serviceName,
      serviceMethod: routeCallback?.serviceMethod
    })
  }

  private getRequestId(request: IncomingMessage): string {
    const requestId = request.headers["x-request-id"]

    if (typeof requestId !== "string" || !requestId.trim()) {
      throw new Exceptions.HttpServerError.BadRequestError("Отсутствует обязательный заголовок x-request-id")
    }

    return requestId
  }

  private matchRoute(request: IncomingMessage): iContracts.iMicroServiceRoute {
    if (!request.method || !request.url) throw new Exceptions.HttpServerError.BadRequestError("Некорректный запрос")

    const path = request.url.split("?")[0]
    const route = this.routes.find((item) => item.url.test(`${request.method}:${path}`))
    
    if (!route) throw new Exceptions.HttpServerError.RouteNotFoundError()

    return route
  }

  private assertPostRequest(request: IncomingMessage): void {
    if (request.method === "POST") return

    throw new Exceptions.HttpServerError.BadRequestError("Внутренний transport микросервиса поддерживает только POST-запросы")
  }

  private assertInternalServiceToken(request: IncomingMessage): void {
    const token = request.headers["x-internal-service-token"]

    if (typeof token === "string" && token === this.config.internalServiceToken) return

    throw new Exceptions.HttpServerError.UnauthorizedError("Invalid internal service token")
  }

  private sendSuccess(response: ServerResponse, status: number, result: unknown): void {
    this.sendJson(response, status, {
      ok: true,
      result,
      error: null
    })
  }

  private sendError(response: ServerResponse, status: number, code: string, message: string): void {
    this.sendJson(response, status, {
      ok: false,
      result: null,
      error: {
        code,
        message
      }
    })
  }

  private sendJson(response: ServerResponse, status: number, payload: iContracts.iApiResponse): void {
    response.statusCode = status
    response.setHeader("Content-Type", "application/json; charset=utf-8")
    response.end(JSON.stringify(payload))
  }

  private getLogLevel(status: number): LogLevel {
    if (status >= 500) return "error"
    if (status >= 400) return "warn"
    return "info"
  }

  use(routes: iContracts.iMicroServiceRoute[]): void {
    this.routes.push(...routes)
  }

  getNativeServer(): Server {
    return this.server
  }

  private normalizePort(val: string): number | string | false {
    const port = parseInt(val, 10)
    if (Number.isNaN(port)) {
      return val
    }
    if (port >= 0) {
      return port
    }
    return false
  }

  listen(port: string): void {
    this.server.listen(this.normalizePort(port), () => {
      this.logger.info(`HTTP-сервер микросервиса запущен на порту ${port}`)
    })
  }
}
