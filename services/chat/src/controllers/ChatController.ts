import type { UUID } from "crypto"
import { MicroServiceController } from "@/libs"
import { ChatService } from "@/services/ChatService"

export class ChatController extends MicroServiceController {
  constructor(private readonly service: ChatService) {
    super()

    const listRoomsRoute: iContracts.iMicroServiceRoute<{ userUid: string }, iSharedChat.ChatRoomsListResponseDto> = {
      url: /^POST:\/chat\/rooms\/list\/?$/,
      method: "POST",
      callback: this.handle(this.service.constructor.name, "listRooms", this.listRooms.bind(this))
    }

    const listMessagesRoute: iContracts.iMicroServiceRoute<iSharedChat.ChatMessagesListPayloadDto & { userUid: string }, iSharedChat.ChatMessagesListResponseDto> = {
      url: /^POST:\/chat\/messages\/list\/?$/,
      method: "POST",
      callback: this.handle(this.service.constructor.name, "listMessages", this.listMessages.bind(this))
    }

    const createRoomRoute: iContracts.iMicroServiceRoute<iSharedChat.ChatRoomCreatePayloadDto & { userUid: string }, iSharedChat.ChatRoomCreateResponseDto> = {
      url: /^POST:\/chat\/rooms\/?$/,
      method: "POST",
      callback: this.handle(this.service.constructor.name, "createRoom", this.createRoom.bind(this))
    }

    const sendMessageRoute: iContracts.iMicroServiceRoute<iSharedChat.ChatMessageSendPayloadDto & { userUid: string }, iSharedChat.ChatMessageSendResponseDto> = {
      url: /^POST:\/chat\/messages\/?$/,
      method: "POST",
      callback: this.handle(this.service.constructor.name, "sendMessage", this.sendMessage.bind(this))
    }

    const assertRoomAccessRoute: iContracts.iMicroServiceRoute<iSharedChat.ChatMessagesListPayloadDto & { userUid: string }, { allowed: true }> = {
      url: /^POST:\/chat\/rooms\/access\/?$/,
      method: "POST",
      callback: this.handle(this.service.constructor.name, "assertRoomAccess", this.assertRoomAccess.bind(this))
    }

    this.addRoutes([listRoomsRoute, listMessagesRoute, createRoomRoute, sendMessageRoute, assertRoomAccessRoute])
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
}
