import { ServerResponse, IncomingMessage, createServer, Server } from "http";
import { randomUUID } from "crypto";
import { Exceptions } from "../Exceptions";
import { HTTPMiddlewares } from "./middlewares";
import { Logger, MethodTracer, TraceContext, LogLevel } from "../Logger";

export interface iHTTPServerEnv {
  VAR_HTTP_PORT: string
  VAR_HTTP_ORIGIN: string
  VAR_HTTP_COOKIE_NAME: string
  VAR_HTTP_JWT_SECRET: string
  VAR_HTTP_JWT_ISSUER?: string
  VAR_HTTP_JWT_AUDIENCE?: string
}

export interface iHTTPConfig {
  port: string
  origin: string
  cookie_name: string
  jwt_secret: string
  jwt_issuer?: string
  jwt_audience?: string
}

export class HTTPServer {
  protected server: Server
  readonly routes: iContracts.iRoute[] = []
  readonly exceptions = Exceptions.HttpServerError
  readonly Middlewares: HTTPMiddlewares
  readonly tracer: MethodTracer
  constructor(readonly config: iHTTPConfig, private logger = new Logger()) {
    this.Middlewares = new HTTPMiddlewares(this.config, this.exceptions)
    this.tracer = new MethodTracer(this.logger)
    this.server = createServer((request, response) => this.handleRequest(request, response));
  }
  private handleRequest(request: IncomingMessage, response: ServerResponse) {
    let body = Buffer.from([])
    const requestId = randomUUID()
    const traceContext = new TraceContext()
    request.on("data", (chunk: Buffer) => {
      body = Buffer.concat([body, chunk])
      if (body.length > 1e6) {
        request.socket.destroy()
      }
    })
    request.on("end", async () => {
      let status = 200
      try {
        const route = this.matchRoute(request)

        if (route.validator) {
          request.scheme = route.validator
          if (request.method === "GET") request.body = request.url?.split("?")[1] ? Object.fromEntries(new URLSearchParams(request.url.split("?")[1])) : {}
          else request.body = body.length ? this.parseRequestBody(body) : {}
        }

        for (const middleware of route.middlewares) {
          const hasError = this.Middlewares[middleware](request, response)

          if (hasError) {
            status = hasError.status
            this.sendError(response, status, this.getMiddlewareErrorCode(status), hasError.message)
            return
          }
        }

        const { controllerName, controllerMethod } = route.callback

        traceContext.addStep({
          layer: "httpServer",
          level: "debug",
          event: "controller call",
          functionName: `${controllerName}.${controllerMethod}`,
          durationMs: 0,
          payload: request.body,
          controllerName,
          controllerMethod
        })

        const data = await this.tracer.trace(
          traceContext,
          "controller",
          controllerMethod,
          "info",
          async () => route.callback({ user: request.user, data: request.body }),
          {
            method: request.method,
            path: request.url,
            event: "controller completed",
            controllerName,
            controllerMethod
          }
        )

        this.applyControllerResult(response, data)
        this.sendSuccess(response, 200, this.getControllerResultData(data))
      } catch (error) {
        const normalizedError = this.normalizeError(error)
        status = this.getErrorStatus(normalizedError)
        this.sendError(response, status, this.getErrorCode(normalizedError), this.getErrorMessage(normalizedError))
      } finally {
        this.logger.log(this.getRequestLogLevel(status), 'request completed', {
          requestId,
          method: request.method,
          path: request.url,
          status,
          trace: traceContext.getTrace()
        })
      }
    })
  }

  private matchRoute(request: IncomingMessage): iContracts.iRoute {
    if (!request.method || !request.url) throw new this.exceptions.BadRequestError("Invalid request")
    const exist = this.routes.find(r => r.url.test(`${request.method}:${request.url}`))
    if (!exist) throw new this.exceptions.RouteNotFoundError()
    return exist
  }

  use(routes: iContracts.iRoute[]) {
    routes.forEach((route) => {
      const routePath = route.url.source.replace(/^\^/, "").replace(/\$$/, "")
      this.routes.push({ ...route, url: new RegExp(`^${route.method}:\\/v1\\/gateway${routePath}$`) })
    });
  }

  private getErrorStatus(error: Error): number {
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

    throw new this.exceptions.InternalServerError("Unhandled server error", { cause: error })
  }

  private normalizeError(error: unknown): Error {
    if (error instanceof Error && this.isMappedError(error)) return error
    if (error instanceof Error) return new this.exceptions.InternalServerError(error.message, { cause: error })
    return new this.exceptions.InternalServerError("Unhandled server error", { cause: error })
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

  private getErrorMessage(error: Error): string {
    return error.message
  }

  private getErrorCode(error: Error): string {
    if (error instanceof this.exceptions.AuthenticationError) return `AUTH_${error.reasonCode.toUpperCase()}`
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

  private getMiddlewareErrorCode(status: number): string {
    if (status === 403) return "ACCESS_DENIED"
    if (status === 422) return "PAYLOAD_VALIDATION_FAILED"
    return "REQUEST_FAILED"
  }

  private getRequestLogLevel(status: number): LogLevel {
    if (status >= 500) return "error"
    if (status >= 400) return "warn"
    return "info"
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

  private applyControllerResult(response: ServerResponse, result: unknown): void {
    if (!this.isControllerResult(result)) return

    const cookies = [
      ...(result.setCookies || []).map((cookie) => this.serializeCookie(cookie)),
      ...(result.clearCookies || []).map((name) => this.serializeCookie({
        name,
        value: "",
        options: {
          httpOnly: true,
          sameSite: "strict",
          path: "/",
          maxAge: 0
        }
      }))
    ]

    if (cookies.length) {
      response.setHeader("Set-Cookie", cookies)
    }
  }

  private getControllerResultData(result: unknown): unknown {
    if (this.isControllerResult(result)) return result.data
    return result
  }

  private isControllerResult(result: unknown): result is iContracts.iControllerResult {
    if (typeof result !== "object" || result === null || Array.isArray(result)) return false
    return "setCookies" in result || "clearCookies" in result
  }

  private serializeCookie(cookie: iContracts.iSetCookie): string {
    const options = cookie.options || {}
    const parts = [`${cookie.name}=${encodeURIComponent(cookie.value)}`]

    if (options.maxAge !== undefined) parts.push(`Max-Age=${options.maxAge}`)
    if (options.path) parts.push(`Path=${options.path}`)
    if (options.httpOnly) parts.push("HttpOnly")
    if (options.secure) parts.push("Secure")
    if (options.sameSite) parts.push(`SameSite=${this.formatSameSite(options.sameSite)}`)

    return parts.join("; ")
  }

  private formatSameSite(value: iContracts.iCookieOptions["sameSite"]): string {
    if (value === "strict") return "Strict"
    if (value === "lax") return "Lax"
    return "None"
  }

  private normalizePort(val: string) {
    const port = parseInt(val, 10);
    if (Number.isNaN(port)) {
      return val;
    }
    if (port >= 0) {
      return port;
    }
    return false;
  }
  listen(port: string) {
    this.server.listen(this.normalizePort(port), () => {
      this.logger.info(`http server started on port ${port}`)
    })
  }

  private parseRequestBody(body: Buffer): iContracts.iPayload {
    try {
      const parsed = JSON.parse(body.toString())
      if (!this.isPayload(parsed)) {
        throw new this.exceptions.BadRequestError("Invalid request payload")
      }

      return parsed
    } catch (error) {
      if (error instanceof this.exceptions.BadRequestError) throw error
      throw new this.exceptions.BadRequestError("Invalid request payload", { cause: error })
    }
  }

  private isPayload(value: unknown): value is iContracts.iPayload {
    return typeof value === "object" && value !== null && !Array.isArray(value)
  }
}
