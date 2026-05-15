import { ChatService } from "@/services/ChatService"
import type { UUID } from "crypto"

export class ChatRoutes {
  private readonly routes: iContracts.iMicroServiceRoute[]

  constructor(private readonly service: ChatService) {
    const listRoomsRoute: iContracts.iMicroServiceRoute<{ userUid: string }, iSharedChat.ChatRoomsListResponseDto> = {
      url: /^\/chat\/rooms\/?$/,
      method: "GET",
      callback: this.handle("listRooms", this.listRooms.bind(this))
    }

    const listMessagesRoute: iContracts.iMicroServiceRoute<iSharedChat.ChatMessagesListPayloadDto & { userUid: string }, iSharedChat.ChatMessagesListResponseDto> = {
      url: /^\/chat\/messages\/?$/,
      method: "GET",
      callback: this.handle("listMessages", this.listMessages.bind(this))
    }

    const createRoomRoute: iContracts.iMicroServiceRoute<iSharedChat.ChatRoomCreatePayloadDto & { userUid: string }, iSharedChat.ChatRoomCreateResponseDto> = {
      url: /^\/chat\/rooms\/?$/,
      method: "POST",
      callback: this.handle("createRoom", this.createRoom.bind(this))
    }

    const sendMessageRoute: iContracts.iMicroServiceRoute<iSharedChat.ChatMessageSendPayloadDto & { userUid: string }, iSharedChat.ChatMessageSendResponseDto> = {
      url: /^\/chat\/messages\/?$/,
      method: "POST",
      callback: this.handle("sendMessage", this.sendMessage.bind(this))
    }

    const assertRoomAccessRoute: iContracts.iMicroServiceRoute<iSharedChat.ChatMessagesListPayloadDto & { userUid: string }, { allowed: true }> = {
      url: /^\/chat\/rooms\/access\/?$/,
      method: "POST",
      callback: this.handle("assertRoomAccess", this.assertRoomAccess.bind(this))
    }

    this.routes = [listRoomsRoute, listMessagesRoute, createRoomRoute, sendMessageRoute, assertRoomAccessRoute]
  }

  getRoutes(): readonly iContracts.iMicroServiceRoute[] {
    return this.routes
  }

  private listRooms(payload: iContracts.iMicroServiceRequestPayload<{ userUid: string }>): Promise<iSharedChat.ChatRoomsListResponseDto> {
    if (!payload.data?.userUid) return Promise.reject(new Error("Отсутствует userUid для ChatService.listRooms"))
    return this.service.listRooms(payload.data.userUid as UUID)
  }

  private listMessages(payload: iContracts.iMicroServiceRequestPayload<iSharedChat.ChatMessagesListPayloadDto & { userUid: string }>): Promise<iSharedChat.ChatMessagesListResponseDto> {
    if (!payload.data?.userUid) return Promise.reject(new Error("Отсутствует userUid для ChatService.listMessages"))
    return this.service.listMessages(payload.data.userUid as UUID, payload.data)
  }

  private createRoom(payload: iContracts.iMicroServiceRequestPayload<iSharedChat.ChatRoomCreatePayloadDto & { userUid: string }>): Promise<iSharedChat.ChatRoomCreateResponseDto> {
    if (!payload.data?.userUid) return Promise.reject(new Error("Отсутствует userUid для ChatService.createRoom"))
    return this.service.createRoom(payload.data.userUid as UUID, payload.data)
  }

  private sendMessage(payload: iContracts.iMicroServiceRequestPayload<iSharedChat.ChatMessageSendPayloadDto & { userUid: string }>): Promise<iSharedChat.ChatMessageSendResponseDto> {
    if (!payload.data?.userUid) return Promise.reject(new Error("Отсутствует userUid для ChatService.sendMessage"))
    return this.service.sendMessage(payload.data.userUid as UUID, payload.data)
  }

  private assertRoomAccess(payload: iContracts.iMicroServiceRequestPayload<iSharedChat.ChatMessagesListPayloadDto & { userUid: string }>): Promise<{ allowed: true }> {
    if (!payload.data?.userUid) return Promise.reject(new Error("Отсутствует userUid для ChatService.assertRoomAccess"))
    return this.service.assertRoomAccess(payload.data.userUid as UUID, payload.data.roomUid)
      .then(() => ({ allowed: true }))
  }

  private handle<TPayload, TResult>(
    serviceMethod: string,
    handler: (payload: TPayload) => Promise<TResult>
  ): iContracts.iMicroServiceRouteCallback<TPayload, TResult> {
    const wrappedHandler = (payload: TPayload): Promise<TResult> => Promise.resolve().then(() => handler(payload))

    return Object.assign(wrappedHandler, {
      serviceName: this.service.constructor.name,
      serviceMethod
    })
  }
}
