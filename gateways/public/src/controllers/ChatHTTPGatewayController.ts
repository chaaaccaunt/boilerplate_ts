import { Exceptions } from "@/libs"
import { InternalServiceClient } from "@/services/InternalServiceClient"
import { BaseController } from "./BaseController"

export class ChatHTTPGatewayController extends BaseController {
  constructor(private readonly chatServiceClient: InternalServiceClient) {
    super()

    const roomsRoute: iContracts.iRoute<iContracts.iPayload, iContracts.iControllerResult<iSharedChat.ChatRoomsListResponseDto>> = {
      url: /^\/chat\/rooms\/?$/,
      method: "GET",
      requireAuthorization: true,
      callback: this.handle("listRooms", this.listRooms.bind(this))
    }

    const messagesRoute: iContracts.iRoute<iSharedChat.ChatMessagesListPayloadDto, iContracts.iControllerResult<iSharedChat.ChatMessagesListResponseDto>> = {
      url: /^\/chat\/messages(?:\?.*)?$/,
      method: "GET",
      requireAuthorization: true,
      validator: {
        roomUid: {
          isPrimitive: {
            string: {
              minLength: 36,
              maxLength: 36
            }
          }
        }
      },
      callback: this.handle("listMessages", this.listMessages.bind(this))
    }

    this.addRoutes([roomsRoute, messagesRoute])
  }

  private listRooms(payload: iContracts.iRequestContextPayload): Promise<iContracts.iControllerResult<iSharedChat.ChatRoomsListResponseDto>> {
    if (!payload.user) throw new Exceptions.ControllerError.UnauthorizedError()

    return this.chatServiceClient.request<iSharedChat.ChatRoomsListResponseDto, { userUid: string }>({
      requestId: payload.requestId,
      path: "/chat/rooms/list",
      payload: { userUid: payload.user.uid }
    })
      .then((data) => ({ data }))
  }

  private listMessages(payload: iContracts.iRequestContextPayload<iSharedChat.ChatMessagesListPayloadDto>): Promise<iContracts.iControllerResult<iSharedChat.ChatMessagesListResponseDto>> {
    if (!payload.user) throw new Exceptions.ControllerError.UnauthorizedError()
    if (!payload.data) throw new Exceptions.ControllerError.InternalError("Отсутствуют данные запроса для ChatHTTPGatewayController.listMessages")

    return this.chatServiceClient.request<iSharedChat.ChatMessagesListResponseDto, iSharedChat.ChatMessagesListPayloadDto & { userUid: string }>({
      requestId: payload.requestId,
      path: "/chat/messages/list",
      payload: {
        ...payload.data,
        userUid: payload.user.uid
      }
    })
      .then((data) => ({ data }))
  }
}
