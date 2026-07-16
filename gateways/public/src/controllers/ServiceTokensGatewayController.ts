import { Exceptions, HTTPController } from "@/libs"
import { InternalServiceClient } from "@/services/InternalServiceClient"

const serviceTokenTypeValidator = { isPrimitive: { string: { minLength: 7, maxLength: 14, reg: /^(service|messenger|social_network)$/ } } }
const serviceNameValidator = { isPrimitive: { string: { minLength: 2, maxLength: 80, reg: /^[a-z][a-z0-9_-]{1,79}$/ } } }
const displayNameValidator = { isPrimitive: { string: { minLength: 1, maxLength: 120 } } }
const tokenValidator = { isPrimitive: { string: { minLength: 1, maxLength: 4096 } } }

export class ServiceTokensGatewayController extends HTTPController {
  constructor(private readonly usersServiceClient: InternalServiceClient) {
    super()

    const listRoute: iContracts.iRoute<iContracts.iPayload, iContracts.iControllerResult<iSharedServiceToken.ListServiceTokensResponseDto>> = {
      url: /^\/service-tokens\/?$/,
      method: "GET",
      requireAuthorization: true,
      callback: this.handle("list", this.list.bind(this))
    }

    const createRoute: iContracts.iRoute<iSharedServiceToken.CreateServiceTokenPayloadDto, iContracts.iControllerResult<iSharedServiceToken.CreateServiceTokenResponseDto>> = {
      url: /^\/service-tokens\/?$/,
      method: "POST",
      requireAuthorization: true,
      validator: {
        type: serviceTokenTypeValidator,
        serviceName: serviceNameValidator,
        displayName: displayNameValidator,
        token: tokenValidator,
        isEnabled: { isPrimitive: { boolean: true } }
      },
      callback: this.handle("create", this.create.bind(this))
    }

    const updateRoute: iContracts.iRoute<iSharedServiceToken.UpdateServiceTokenPayloadDto, iContracts.iControllerResult<iSharedServiceToken.UpdateServiceTokenResponseDto>> = {
      url: /^\/service-tokens\/?$/,
      method: "PATCH",
      requireAuthorization: true,
      validator: {
        uid: { isPrimitive: { string: { minLength: 36, maxLength: 36, reg: /^[0-9a-fA-F-]{36}$/ } } },
        type: serviceTokenTypeValidator,
        serviceName: serviceNameValidator,
        displayName: displayNameValidator,
        token: { optional: true, isPrimitive: { string: { minLength: 1, maxLength: 4096 } } },
        isEnabled: { isPrimitive: { boolean: true } }
      },
      callback: this.handle("update", this.update.bind(this))
    }

    const deleteRoute: iContracts.iRoute<iSharedServiceToken.DeleteServiceTokenPayloadDto, iContracts.iControllerResult<iSharedServiceToken.DeleteServiceTokenResponseDto>> = {
      url: /^\/service-tokens\/?$/,
      method: "DELETE",
      requireAuthorization: true,
      validator: {
        uid: { isPrimitive: { string: { minLength: 36, maxLength: 36, reg: /^[0-9a-fA-F-]{36}$/ } } }
      },
      callback: this.handle("delete", this.delete.bind(this))
    }

    this.addRoutes([listRoute, createRoute, updateRoute, deleteRoute])
  }

  private list(payload: iContracts.iRequestContextPayload): Promise<iContracts.iControllerResult<iSharedServiceToken.ListServiceTokensResponseDto>> {
    this.access(payload, ["superadministrator"])

    return this.usersServiceClient.request<iSharedServiceToken.ListServiceTokensResponseDto>({
      requestId: payload.requestId,
      path: "/service-tokens/list"
    })
      .then((data) => ({ data }))
  }

  private create(payload: iContracts.iRequestContextPayload<iSharedServiceToken.CreateServiceTokenPayloadDto>): Promise<iContracts.iControllerResult<iSharedServiceToken.CreateServiceTokenResponseDto>> {
    this.access(payload, ["superadministrator"])

    if (!payload.data) throw new Exceptions.ControllerError.InternalError("Отсутствуют данные запроса для ServiceTokensGatewayController.create")

    return this.usersServiceClient.request<iSharedServiceToken.CreateServiceTokenResponseDto, iSharedServiceToken.CreateServiceTokenPayloadDto>({
      requestId: payload.requestId,
      path: "/service-tokens",
      payload: payload.data
    })
      .then((data) => ({ data }))
  }

  private update(payload: iContracts.iRequestContextPayload<iSharedServiceToken.UpdateServiceTokenPayloadDto>): Promise<iContracts.iControllerResult<iSharedServiceToken.UpdateServiceTokenResponseDto>> {
    this.access(payload, ["superadministrator"])

    if (!payload.data) throw new Exceptions.ControllerError.InternalError("Отсутствуют данные запроса для ServiceTokensGatewayController.update")

    return this.usersServiceClient.request<iSharedServiceToken.UpdateServiceTokenResponseDto, iSharedServiceToken.UpdateServiceTokenPayloadDto>({
      requestId: payload.requestId,
      path: "/service-tokens/update",
      payload: payload.data
    })
      .then((data) => ({ data }))
  }

  private delete(payload: iContracts.iRequestContextPayload<iSharedServiceToken.DeleteServiceTokenPayloadDto>): Promise<iContracts.iControllerResult<iSharedServiceToken.DeleteServiceTokenResponseDto>> {
    this.access(payload, ["superadministrator"])

    if (!payload.data) throw new Exceptions.ControllerError.InternalError("Отсутствуют данные запроса для ServiceTokensGatewayController.delete")

    return this.usersServiceClient.request<iSharedServiceToken.DeleteServiceTokenResponseDto, iSharedServiceToken.DeleteServiceTokenPayloadDto>({
      requestId: payload.requestId,
      path: "/service-tokens/delete",
      payload: payload.data
    })
      .then((data) => ({ data }))
  }
}
