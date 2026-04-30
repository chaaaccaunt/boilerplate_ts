import { Exceptions } from "@/libs/Exceptions"

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
    const wrappedHandler = async (payload: TPayload): Promise<TResult> => {
      try {
        return await handler(payload)
      } catch (error) {
        if (error instanceof Exceptions.ControllerError.AccessDeniedError) {
          throw error
        }

        if (error instanceof Exceptions.ControllerError.UnauthorizedError) {
          throw error
        }

        if (error instanceof Exceptions.ServiceError.NotFoundError) {
          throw new Exceptions.ControllerError.NotFoundError(error.message, { cause: error })
        }

        if (error instanceof Exceptions.ServiceError.AuthenticationError) {
          throw new Exceptions.ControllerError.UnauthorizedError(error.message, { cause: error })
        }

        if (error instanceof Exceptions.ServiceError.ConflictError) {
          throw new Exceptions.ControllerError.ConflictError(error.message, { cause: error })
        }

        if (error instanceof Exceptions.ServiceError.InternalError) {
          throw new Exceptions.ControllerError.InternalError(error.message, { cause: error })
        }

        if (error instanceof Error) {
          throw new Exceptions.ControllerError.InternalError(error.message, { cause: error })
        }

        throw new Exceptions.ControllerError.InternalError('Unhandled controller exception', { cause: error })
      }
    }

    return Object.assign(wrappedHandler, {
      controllerName: this.constructor.name,
      controllerMethod
    })
  }
}
