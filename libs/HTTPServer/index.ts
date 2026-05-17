import { ServerResponse, IncomingMessage, createServer, Server } from "http"
import { randomUUID } from "crypto"
import { Exceptions } from "../Exceptions"
import { HTTPMiddlewares } from "./middlewares"
import { Logger, MethodTracer, TraceContext } from "../Logger"
import { HTTPRequestBodyParser } from "./RequestBodyParser"
import { HTTPResponseSender } from "./ResponseSender"
import { HTTPErrorMapper } from "./ErrorMapper"

export interface iHTTPServerEnv {
  VAR_HTTP_PORT: string
  VAR_HTTP_ORIGIN: string
  VAR_HTTP_COOKIE_NAME: string
  VAR_HTTP_PUBLIC_USER_COOKIE_NAME: string
  VAR_HTTP_PUBLIC_USER_COOKIE_DOMAIN: string
  VAR_HTTP_JWT_SECRET: string
  VAR_HTTP_JWT_ISSUER: string
  VAR_HTTP_JWT_AUDIENCE: string
}

export interface iHTTPConfig {
  port: string
  origin: string
  cookie_name: string
  public_user_cookie_name: string
  public_user_cookie_domain: string
  jwt_secret: string
  jwt_issuer: string
  jwt_audience: string
}

interface RequestContext {
  requestId: string
  traceContext: TraceContext
  route: iContracts.iRoute | null
}

export class HTTPServer {
  private readonly jsonRequestBodyLimit = 1_000_000
  private readonly multipartRequestBodyLimit = 100_000_000
  protected server: Server
  readonly routes: iContracts.iRoute[] = []
  readonly exceptions = Exceptions.HttpServerError
  readonly Middlewares: HTTPMiddlewares
  readonly tracer: MethodTracer
  private readonly bodyParser: HTTPRequestBodyParser
  private readonly responseSender: HTTPResponseSender
  private readonly errorMapper: HTTPErrorMapper

  constructor(readonly config: iHTTPConfig, private logger = new Logger()) {
    this.Middlewares = new HTTPMiddlewares(this.config, this.exceptions)
    this.tracer = new MethodTracer(this.logger)
    this.bodyParser = new HTTPRequestBodyParser(this.exceptions, this.jsonRequestBodyLimit, this.multipartRequestBodyLimit)
    this.responseSender = new HTTPResponseSender(this.config)
    this.errorMapper = new HTTPErrorMapper(this.exceptions, this.logger)
    this.server = createServer((request, response) => this.handleRequest(request, response))
  }

  private handleRequest(request: IncomingMessage, response: ServerResponse): void {
    const context: RequestContext = {
      requestId: randomUUID(),
      traceContext: new TraceContext(),
      route: null
    }

    Promise.resolve()
      .then(() => this.resolveRoute(request, context))
      .then((route) => this.processRoute(request, response, route, context))
      .then((status) => this.logRequest(request, context, status))
      .catch((error) => this.finishRequestWithError(error, request, response, context))
  }

  private resolveRoute(request: IncomingMessage, context: RequestContext): iContracts.iRoute {
    const route = this.matchRoute(request)
    context.route = route
    return route
  }

  private processRoute(
    request: IncomingMessage,
    response: ServerResponse,
    route: iContracts.iRoute,
    context: RequestContext
  ): Promise<number> {
    if (route.requireAuthorization) {
      this.Middlewares.httpTokenValidator(request, response)
    }

    if (this.getRequestBodyType(route) === "multipart") {
      return this.processMultipartRoute(request, response, route, context)
    }

    return this.processJsonRoute(request, response, route, context)
  }

  private processJsonRoute(
    request: IncomingMessage,
    response: ServerResponse,
    route: iContracts.iRoute,
    context: RequestContext
  ): Promise<number> {
    return this.bodyParser.readBody(request, this.jsonRequestBodyLimit)
      .then((body) => {
        this.prepareJsonRequestPayload(request, route, body)
        this.validateRequestPayload(request, response, route)
        return this.callController(request, response, route, context.traceContext, context.requestId)
      })
      .then(() => 200)
  }

  private processMultipartRoute(
    request: IncomingMessage,
    response: ServerResponse,
    route: iContracts.iRoute,
    context: RequestContext
  ): Promise<number> {
    let multipartBody: iContracts.iMultipartPayload | null = null
    let controllerCalled = false

    return this.bodyParser.parseMultipartRequest(request)
      .then((body) => {
        multipartBody = body
        this.prepareMultipartRequestPayload(request, response, route, body)
        controllerCalled = true
        return this.callController(request, response, route, context.traceContext, context.requestId)
      })
      .then(() => 200)
      .catch((error) => {
        if (!multipartBody || controllerCalled) {
          return Promise.reject(error)
        }

        return this.bodyParser.cleanupUploadedFiles(multipartBody.files)
          .then(() => Promise.reject(error))
      })
  }

  private prepareJsonRequestPayload(request: IncomingMessage, route: iContracts.iRoute, body: Buffer): void {
    if (route.validator) request.scheme = route.validator

    if (request.method === "GET") {
      request.body = request.url?.split("?")[1] ? Object.fromEntries(new URLSearchParams(request.url.split("?")[1])) : {}
      return
    }

    request.body = body.length ? this.bodyParser.parseJsonBody(body) : {}
  }

  private prepareMultipartRequestPayload(
    request: IncomingMessage,
    response: ServerResponse,
    route: iContracts.iRoute,
    body: iContracts.iMultipartPayload
  ): void {
    request.body = body

    if (!route.validator) return

    request.scheme = route.validator
    request.body = body.fields
    this.validateRequestPayload(request, response, route)
    request.body = body
  }

  private validateRequestPayload(request: IncomingMessage, response: ServerResponse, route: iContracts.iRoute): void {
    if (!route.validator) return

    const validationError = this.Middlewares.payloadValidator(request, response)
    if (!validationError) return

    throw new this.exceptions.PayloadValidationError(validationError.message)
  }

  private callController(
    request: IncomingMessage,
    response: ServerResponse,
    route: iContracts.iRoute,
    traceContext: TraceContext,
    requestId: string
  ): Promise<void> {
    const { controllerName, controllerMethod } = route.callback

    traceContext.addStep({
      layer: "httpServer",
      level: "debug",
      event: "вызов контроллера",
      functionName: `${controllerName}.${controllerMethod}`,
      durationMs: 0,
      payload: request.body,
      controllerName,
      controllerMethod
    })

    return this.tracer.trace(
      traceContext,
      "controller",
      controllerMethod,
      "info",
      () => route.callback({ requestId, user: request.user, headers: request.headers, data: request.body }),
      {
        method: request.method,
        path: request.url,
        event: "контроллер завершил работу",
        controllerName,
        controllerMethod
      }
    )
      .then((data) => {
        this.responseSender.applyControllerResult(response, data)
        if (this.responseSender.isFileControllerResult(data)) {
          this.responseSender.sendFile(response, data)
          return
        }

        this.responseSender.sendSuccess(response, 200, this.responseSender.getControllerResultData(data))
      })
  }

  private finishRequestWithError(
    error: unknown,
    request: IncomingMessage,
    response: ServerResponse,
    context: RequestContext
  ): void {
    const normalizedError = this.errorMapper.normalize(error)
    const status = this.errorMapper.getStatus(normalizedError)

    if (status === 401) {
      this.responseSender.applyClearCookies(response, context.route?.clearCookiesOnError || [])
    }

    if (status >= 500) {
      this.errorMapper.logInternalError(normalizedError, request, context.requestId, status)
    }

    this.responseSender.sendError(
      response,
      status,
      this.errorMapper.getCode(normalizedError),
      this.errorMapper.getMessage(normalizedError)
    )
    this.logRequest(request, context, status)
  }

  private logRequest(request: IncomingMessage, context: RequestContext, status: number): void {
    this.logger.log(this.errorMapper.getLogLevel(status), "запрос завершен", {
      requestId: context.requestId,
      method: request.method,
      path: request.url,
      status,
      trace: context.traceContext.getTrace()
    })
  }

  private getRequestBodyType(route: iContracts.iRoute): iContracts.iRequestBodyType {
    return route.requestBodyType || "json"
  }

  private matchRoute(request: IncomingMessage): iContracts.iRoute {
    if (!request.method || !request.url) throw new this.exceptions.BadRequestError("Некорректный запрос")
    const exist = this.routes.find(r => r.url.test(`${request.method}:${request.url}`))
    if (!exist) throw new this.exceptions.RouteNotFoundError()
    return exist
  }

  use(routes: iContracts.iRoute[]) {
    routes.forEach((route) => {
      const routePath = route.url.source.replace(/^\^/, "").replace(/\$$/, "")
      this.routes.push({ ...route, url: new RegExp(`^${route.method}:\\/v1\\/gateway${routePath}$`) })
    })
  }

  getNativeServer(): Server {
    return this.server
  }

  private normalizePort(val: string) {
    const port = parseInt(val, 10)
    if (Number.isNaN(port)) {
      return val
    }
    if (port >= 0) {
      return port
    }
    return false
  }

  listen(port: string) {
    this.server.listen(this.normalizePort(port), () => {
      this.logger.info(`HTTP-сервер запущен на порту ${port}`)
    })
  }
}
