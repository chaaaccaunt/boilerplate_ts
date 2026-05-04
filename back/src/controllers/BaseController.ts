import { Exceptions } from "@/libs"

export abstract class BaseController {
  protected readonly routes: iContracts.iRoute[] = []

  public getRoutes(): readonly iContracts.iRoute[] {
    return this.routes
  }

  protected addRoutes(routes: iContracts.iRoute[]): void {
    this.routes.push(...routes)
  }

  protected handle<TPayload, TResult>(
    controllerMethod: string,
    handler: (payload: TPayload) => Promise<TResult>
  ): iContracts.iRouteCallback<TPayload, TResult> {
    const wrappedHandler = (payload: TPayload): Promise<TResult> => Promise.resolve()
      .then(() => handler(payload))
      .catch((error) => {
        throw this.mapControllerError(error)
      })

    return Object.assign(wrappedHandler, {
      controllerName: this.constructor.name,
      controllerMethod
    })
  }

  private mapControllerError(error: unknown): Error {
    if (error instanceof Exceptions.ControllerError.AccessDeniedError) return error
    if (error instanceof Exceptions.ControllerError.UnauthorizedError) return error
    if (error instanceof Exceptions.ServiceError.NotFoundError) return new Exceptions.ControllerError.NotFoundError(error.message, { cause: error })
    if (error instanceof Exceptions.ServiceError.AuthenticationError) return new Exceptions.ControllerError.UnauthorizedError(error.message, { cause: error })
    if (error instanceof Exceptions.ServiceError.ConflictError) return new Exceptions.ControllerError.ConflictError(error.message, { cause: error })
    if (error instanceof Exceptions.ServiceError.InternalError) return new Exceptions.ControllerError.InternalError(error.message, { cause: error })
    if (error instanceof Error) return new Exceptions.ControllerError.InternalError(error.message, { cause: error })

    return new Exceptions.ControllerError.InternalError("Необработанная ошибка контроллера", { cause: error })
  }
}
