export abstract class MicroServiceController {
  protected readonly routes: iContracts.iMicroServiceRoute[] = []

  public getRoutes(): readonly iContracts.iMicroServiceRoute[] {
    return this.routes
  }

  protected addRoutes(routes: iContracts.iMicroServiceRoute[]): void {
    routes.forEach((route) => {
      if (route.method !== "POST" || !route.url.source.startsWith("^POST:")) {
        throw new Error("Маршрут микросервиса должен использовать method POST и regex формата /^POST:/")
      }
    })

    this.routes.push(...routes)
  }

  protected handle<TPayload, TResult>(
    serviceName: string,
    serviceMethod: string,
    handler: (payload: TPayload) => Promise<TResult>
  ): iContracts.iMicroServiceRouteCallback<TPayload, TResult> {
    const wrappedHandler = (payload: TPayload): Promise<TResult> => Promise.resolve().then(() => handler(payload))

    return Object.assign(wrappedHandler, {
      serviceName,
      serviceMethod
    })
  }
}
