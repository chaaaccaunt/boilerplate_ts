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

    const availableMembersRoute: iContracts.iRoute<iContracts.iPayload, iContracts.iControllerResult<iSharedChat.ChatAvailableMembersListResponseDto>> = {
      url: /^\/chat\/members\/available\/?$/,
      method: "GET",
      requireAuthorization: true,
      callback: this.handle("listAvailableMembers", this.listAvailableMembers.bind(this))
    }

    const closedRoomsRoute: iContracts.iRoute<iContracts.iPayload, iContracts.iControllerResult<iSharedChat.ChatClosedRoomsListResponseDto>> = {
      url: /^\/chat\/admin\/rooms\/closed\/?$/,
      method: "GET",
      requireAuthorization: true,
      callback: this.handle("listClosedRooms", this.listClosedRooms.bind(this))
    }

    const adminMessagesRoute: iContracts.iRoute<iSharedChat.ChatAdminMessagesListPayloadDto, iContracts.iControllerResult<iSharedChat.ChatMessagesListResponseDto>> = {
      url: /^\/chat\/admin\/messages(?:\?.*)?$/,
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
      callback: this.handle("listAdminMessages", this.listAdminMessages.bind(this))
    }

    const hardDeleteRoomRoute: iContracts.iRoute<iSharedChat.ChatAdminHardDeleteRoomPayloadDto, iContracts.iControllerResult<iSharedChat.ChatAdminHardDeleteRoomResponseDto>> = {
      url: /^\/chat\/admin\/rooms\/hard-delete\/?$/,
      method: "DELETE",
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
      callback: this.handle("hardDeleteRoom", this.hardDeleteRoom.bind(this))
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

    this.addRoutes([roomsRoute, availableMembersRoute, closedRoomsRoute, adminMessagesRoute, hardDeleteRoomRoute, messagesRoute])
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

  private listClosedRooms(payload: iContracts.iRequestContextPayload): Promise<iContracts.iControllerResult<iSharedChat.ChatClosedRoomsListResponseDto>> {
    this.access(payload, ["administrator"])

    return this.chatServiceClient.request<iSharedChat.ChatClosedRoomsListResponseDto>({
      requestId: payload.requestId,
      path: "/chat/admin/rooms/closed/list"
    })
      .then((data) => ({ data }))
  }

  private listAdminMessages(payload: iContracts.iRequestContextPayload<iSharedChat.ChatAdminMessagesListPayloadDto>): Promise<iContracts.iControllerResult<iSharedChat.ChatMessagesListResponseDto>> {
    this.access(payload, ["administrator"])
    if (!payload.data) throw new Exceptions.ControllerError.InternalError("Отсутствуют данные запроса для ChatHTTPGatewayController.listAdminMessages")

    return this.chatServiceClient.request<iSharedChat.ChatMessagesListResponseDto, iSharedChat.ChatAdminMessagesListPayloadDto>({
      requestId: payload.requestId,
      path: "/chat/admin/messages/list",
      payload: payload.data
    })
      .then((data) => ({ data }))
  }

  private hardDeleteRoom(payload: iContracts.iRequestContextPayload<iSharedChat.ChatAdminHardDeleteRoomPayloadDto>): Promise<iContracts.iControllerResult<iSharedChat.ChatAdminHardDeleteRoomResponseDto>> {
    this.access(payload, ["administrator"])
    if (!payload.data) throw new Exceptions.ControllerError.InternalError("Отсутствуют данные запроса для ChatHTTPGatewayController.hardDeleteRoom")

    return this.chatServiceClient.request<iSharedChat.ChatAdminHardDeleteRoomResponseDto, iSharedChat.ChatAdminHardDeleteRoomPayloadDto>({
      requestId: payload.requestId,
      path: "/chat/admin/rooms/hard-delete",
      payload: payload.data
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
