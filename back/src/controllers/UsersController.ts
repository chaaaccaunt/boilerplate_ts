import { Exceptions, WebSocketServer } from "@/libs"
import { UsersService } from "@/services/UsersService"
import { BaseController } from "./BaseController"

interface iUsersControllerPayload<TData = iContracts.iPayload> {
  user?: iContracts.iUserToken
  data?: TData
}

export class UsersController extends BaseController {
  private readonly service: UsersService

  constructor(models: iDatabase.Models, private readonly webSocketServer: WebSocketServer) {
    super()
    this.service = new UsersService(models.User, models.Role, models.UserRole)

    const listRoute: iContracts.iRoute<iContracts.iPayload, iContracts.iControllerResult<iSharedUser.ListUsersResponseDto>> = {
      url: /^\/users\/?$/,
      method: "GET",
      requireAuthorization: true,
      callback: this.handle("list", this.list.bind(this))
    }

    const createRoute: iContracts.iRoute<iSharedUser.CreateUserPayloadDto, iContracts.iControllerResult<iSharedUser.CreateUserResponseDto>> = {
      url: /^\/users\/?$/,
      method: "POST",
      requireAuthorization: true,
      validator: {
        login: { isEmail: true },
        password: { isPrimitive: { string: { minLength: 8, maxLength: 128 } } },
        firstName: { isPrimitive: { string: { minLength: 1, maxLength: 64 } } },
        lastName: { isPrimitive: { string: { minLength: 1, maxLength: 64 } } },
        surname: { optional: true, isPrimitive: { string: { minLength: 1, maxLength: 64 } } },
        roleNames: {
          isArray: {
            isPrimitive: {
              string: {
                minLength: 1,
                maxLength: 64,
                reg: /^(administrator|user)$/
              }
            }
          }
        }
      },
      callback: this.handle("create", this.create.bind(this))
    }

    const rolesRoute: iContracts.iRoute<iContracts.iPayload, iContracts.iControllerResult<iSharedUser.ListRolesResponseDto>> = {
      url: /^\/users\/roles\/?$/,
      method: "GET",
      requireAuthorization: true,
      callback: this.handle("listRoles", this.listRoles.bind(this))
    }

    this.addRoutes([listRoute, createRoute, rolesRoute])
  }

  private list(payload: iUsersControllerPayload): Promise<iContracts.iControllerResult<iSharedUser.ListUsersResponseDto>> {
    this.access(payload, ["administrator"])

    return this.service.list()
      .then((users) => ({
        data: { users }
      }))
  }

  private create(
    payload: iUsersControllerPayload<iSharedUser.CreateUserPayloadDto>
  ): Promise<iContracts.iControllerResult<iSharedUser.CreateUserResponseDto>> {
    const actor = this.access(payload, ["administrator"])

    if (!payload.data) throw new Exceptions.ControllerError.InternalError("Отсутствуют данные запроса для UsersController.create")

    return this.service.create(payload.data)
      .then((user) => {
        this.webSocketServer.broadcast<iSharedUser.UserCreatedEventDto>(
          "users:created",
          { user },
          { excludeUserUid: actor.uid }
        )

        return {
          data: user
        }
      })
  }

  private listRoles(payload: iUsersControllerPayload): Promise<iContracts.iControllerResult<iSharedUser.ListRolesResponseDto>> {
    this.access(payload, ["administrator"])

    return this.service.listRoles()
      .then((roles) => ({
        data: { roles }
      }))
  }
}
