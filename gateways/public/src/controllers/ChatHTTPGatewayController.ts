import { Exceptions } from "@/libs"
import { InternalServiceClient } from "@/services/InternalServiceClient"
import { HTTPController } from "@/libs"

export class ChatHTTPGatewayController extends HTTPController {
  constructor(private readonly chatServiceClient: InternalServiceClient) {
    super()

    const roomsRoute: iContracts.iRoute<iContracts.iPayload, iContracts.iControllerResult<iSharedChat.ChatRoomsListResponseDto>> = {
      url: /^\/chat\/rooms\/?$/,
      method: "GET",
      requireAuthorization: true,
      callback: this.handle("listRooms", this.listRooms.bind(this))
    }

    const availableMembersRoute: iContracts.iRoute<iContracts.iPayload, iContracts.iControllerResult<iSharedChat.ChatAvailableMembersListResponseDto>> = {
      url: /^\/chat\/members\/available\/?$/,
      method: "GET",
      requireAuthorization: true,
      callback: this.handle("listAvailableMembers", this.listAvailableMembers.bind(this))
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

    const updateMessageRoute: iContracts.iRoute<iSharedChat.ChatMessageUpdatePayloadDto, iContracts.iControllerResult<iSharedChat.ChatMessageUpdateResponseDto>> = {
      url: /^\/chat\/messages\/?$/,
      method: "PATCH",
      requireAuthorization: true,
      validator: {
        messageUid: { isPrimitive: { string: { minLength: 36, maxLength: 36 } } },
        text: { optional: true, isPrimitive: { string: { minLength: 1, maxLength: 4000 } } },
        files: { optional: true, isArray: { isObject: { fileUid: { isPrimitive: { string: { minLength: 1, maxLength: 128 } } } } } }
      },
      callback: this.handle("updateMessage", this.updateMessage.bind(this))
    }

    const deleteMessageRoute: iContracts.iRoute<iSharedChat.ChatMessageDeletePayloadDto, iContracts.iControllerResult<iSharedChat.ChatMessageDeleteResponseDto>> = {
      url: /^\/chat\/messages\/?$/,
      method: "DELETE",
      requireAuthorization: true,
      validator: {
        messageUid: { isPrimitive: { string: { minLength: 36, maxLength: 36 } } }
      },
      callback: this.handle("deleteMessage", this.deleteMessage.bind(this))
    }

    const deleteMessageFileRoute: iContracts.iRoute<iSharedChat.ChatMessageFileDeletePayloadDto, iContracts.iControllerResult<iSharedChat.ChatMessageFileDeleteResponseDto>> = {
      url: /^\/chat\/messages\/files\/?$/,
      method: "DELETE",
      requireAuthorization: true,
      validator: {
        messageUid: { isPrimitive: { string: { minLength: 36, maxLength: 36 } } },
        fileUid: { isPrimitive: { string: { minLength: 1, maxLength: 128 } } }
      },
      callback: this.handle("deleteMessageFile", this.deleteMessageFile.bind(this))
    }

    this.addRoutes([roomsRoute, availableMembersRoute, messagesRoute, updateMessageRoute, deleteMessageRoute, deleteMessageFileRoute])
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

  private listAvailableMembers(payload: iContracts.iRequestContextPayload): Promise<iContracts.iControllerResult<iSharedChat.ChatAvailableMembersListResponseDto>> {
    this.access(payload)

    return this.chatServiceClient.request<iSharedChat.ChatAvailableMembersListResponseDto>({
      requestId: payload.requestId,
      path: "/chat/members/available"
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

  private updateMessage(payload: iContracts.iRequestContextPayload<iSharedChat.ChatMessageUpdatePayloadDto>): Promise<iContracts.iControllerResult<iSharedChat.ChatMessageUpdateResponseDto>> {
    if (!payload.user) throw new Exceptions.ControllerError.UnauthorizedError()
    if (!payload.data) throw new Exceptions.ControllerError.InternalError("Отсутствуют данные запроса для ChatHTTPGatewayController.updateMessage")

    return this.chatServiceClient.request<iSharedChat.ChatMessageUpdateResponseDto, iSharedChat.ChatMessageUpdatePayloadDto & { userUid: string }>({
      requestId: payload.requestId,
      path: "/chat/messages/update",
      payload: {
        ...payload.data,
        userUid: payload.user.uid
      }
    })
      .then((data) => ({ data }))
  }

  private deleteMessage(payload: iContracts.iRequestContextPayload<iSharedChat.ChatMessageDeletePayloadDto>): Promise<iContracts.iControllerResult<iSharedChat.ChatMessageDeleteResponseDto>> {
    if (!payload.user) throw new Exceptions.ControllerError.UnauthorizedError()
    if (!payload.data) throw new Exceptions.ControllerError.InternalError("Отсутствуют данные запроса для ChatHTTPGatewayController.deleteMessage")

    return this.chatServiceClient.request<iSharedChat.ChatMessageDeleteResponseDto, iSharedChat.ChatMessageDeletePayloadDto & { userUid: string }>({
      requestId: payload.requestId,
      path: "/chat/messages/delete",
      payload: {
        ...payload.data,
        userUid: payload.user.uid
      }
    })
      .then((data) => ({ data }))
  }

  private deleteMessageFile(payload: iContracts.iRequestContextPayload<iSharedChat.ChatMessageFileDeletePayloadDto>): Promise<iContracts.iControllerResult<iSharedChat.ChatMessageFileDeleteResponseDto>> {
    if (!payload.user) throw new Exceptions.ControllerError.UnauthorizedError()
    if (!payload.data) throw new Exceptions.ControllerError.InternalError("Отсутствуют данные запроса для ChatHTTPGatewayController.deleteMessageFile")

    return this.chatServiceClient.request<iSharedChat.ChatMessageFileDeleteResponseDto, iSharedChat.ChatMessageFileDeletePayloadDto & { userUid: string }>({
      requestId: payload.requestId,
      path: "/chat/messages/files/delete",
      payload: {
        ...payload.data,
        userUid: payload.user.uid
      }
    })
      .then((data) => ({ data }))
  }
}
