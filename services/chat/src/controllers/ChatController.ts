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

    const listAvailableMembersRoute: iContracts.iMicroServiceRoute<iContracts.iPayload, iSharedChat.ChatAvailableMembersListResponseDto> = {
      url: /^POST:\/chat\/members\/available\/?$/,
      method: "POST",
      callback: this.handle(this.service.constructor.name, "listAvailableMembers", this.listAvailableMembers.bind(this))
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

    const updateRoomRoute: iContracts.iMicroServiceRoute<iSharedChat.ChatRoomUpdatePayloadDto & { userUid: string }, iSharedChat.ChatRoomUpdateResponseDto> = {
      url: /^POST:\/chat\/rooms\/update\/?$/,
      method: "POST",
      callback: this.handle(this.service.constructor.name, "updateRoom", this.updateRoom.bind(this))
    }

    const deleteRoomRoute: iContracts.iMicroServiceRoute<iSharedChat.ChatRoomDeletePayloadDto & { userUid: string }, iSharedChat.ChatRoomDeleteResponseDto> = {
      url: /^POST:\/chat\/rooms\/delete\/?$/,
      method: "POST",
      callback: this.handle(this.service.constructor.name, "deleteRoom", this.deleteRoom.bind(this))
    }

    const leaveRoomRoute: iContracts.iMicroServiceRoute<iSharedChat.ChatRoomLeavePayloadDto & { userUid: string }, iSharedChat.ChatRoomLeaveResponseDto> = {
      url: /^POST:\/chat\/rooms\/leave\/?$/,
      method: "POST",
      callback: this.handle(this.service.constructor.name, "leaveRoom", this.leaveRoom.bind(this))
    }

    const sendMessageRoute: iContracts.iMicroServiceRoute<iSharedChat.ChatMessageSendPayloadDto & { userUid: string }, iSharedChat.ChatMessageSendResponseDto> = {
      url: /^POST:\/chat\/messages\/?$/,
      method: "POST",
      callback: this.handle(this.service.constructor.name, "sendMessage", this.sendMessage.bind(this))
    }

    const updateMessageRoute: iContracts.iMicroServiceRoute<iSharedChat.ChatMessageUpdatePayloadDto & { userUid: string }, iSharedChat.ChatMessageUpdateResponseDto> = {
      url: /^POST:\/chat\/messages\/update\/?$/,
      method: "POST",
      callback: this.handle(this.service.constructor.name, "updateMessage", this.updateMessage.bind(this))
    }

    const deleteMessageRoute: iContracts.iMicroServiceRoute<iSharedChat.ChatMessageDeletePayloadDto & { userUid: string }, iSharedChat.ChatMessageDeleteResponseDto> = {
      url: /^POST:\/chat\/messages\/delete\/?$/,
      method: "POST",
      callback: this.handle(this.service.constructor.name, "deleteMessage", this.deleteMessage.bind(this))
    }

    const deleteMessageFileRoute: iContracts.iMicroServiceRoute<iSharedChat.ChatMessageFileDeletePayloadDto & { userUid: string }, iSharedChat.ChatMessageFileDeleteResponseDto> = {
      url: /^POST:\/chat\/messages\/files\/delete\/?$/,
      method: "POST",
      callback: this.handle(this.service.constructor.name, "deleteMessageFile", this.deleteMessageFile.bind(this))
    }

    const assertRoomAccessRoute: iContracts.iMicroServiceRoute<iSharedChat.ChatMessagesListPayloadDto & { userUid: string }, { allowed: true }> = {
      url: /^POST:\/chat\/rooms\/access\/?$/,
      method: "POST",
      callback: this.handle(this.service.constructor.name, "assertRoomAccess", this.assertRoomAccess.bind(this))
    }

    this.addRoutes([
      listRoomsRoute,
      listAvailableMembersRoute,
      listMessagesRoute,
      createRoomRoute,
      updateRoomRoute,
      deleteRoomRoute,
      leaveRoomRoute,
      sendMessageRoute,
      updateMessageRoute,
      deleteMessageRoute,
      deleteMessageFileRoute,
      assertRoomAccessRoute
    ])
  }

  private listRooms(payload: iContracts.iMicroServiceRequestPayload<{ userUid: string }>): Promise<iSharedChat.ChatRoomsListResponseDto> {
    if (!payload.data?.userUid) return Promise.reject(new Error("Отсутствует userUid для ChatService.listRooms"))
    return this.service.listRooms(payload.data.userUid as UUID)
  }

  private listAvailableMembers(): Promise<iSharedChat.ChatAvailableMembersListResponseDto> {
    return this.service.listAvailableMembers()
  }

  private listMessages(payload: iContracts.iMicroServiceRequestPayload<iSharedChat.ChatMessagesListPayloadDto & { userUid: string }>): Promise<iSharedChat.ChatMessagesListResponseDto> {
    if (!payload.data?.userUid) return Promise.reject(new Error("Отсутствует userUid для ChatService.listMessages"))
    return this.service.listMessages(payload.data.userUid as UUID, payload.data)
  }

  private createRoom(payload: iContracts.iMicroServiceRequestPayload<iSharedChat.ChatRoomCreatePayloadDto & { userUid: string }>): Promise<iSharedChat.ChatRoomCreateResponseDto> {
    if (!payload.data?.userUid) return Promise.reject(new Error("Отсутствует userUid для ChatService.createRoom"))
    return this.service.createRoom(payload.data.userUid as UUID, payload.data)
  }

  private updateRoom(payload: iContracts.iMicroServiceRequestPayload<iSharedChat.ChatRoomUpdatePayloadDto & { userUid: string }>): Promise<iSharedChat.ChatRoomUpdateResponseDto> {
    if (!payload.data?.userUid) return Promise.reject(new Error("Отсутствует userUid для ChatService.updateRoom"))
    return this.service.updateRoom(payload.data.userUid as UUID, payload.data)
  }

  private deleteRoom(payload: iContracts.iMicroServiceRequestPayload<iSharedChat.ChatRoomDeletePayloadDto & { userUid: string }>): Promise<iSharedChat.ChatRoomDeleteResponseDto> {
    if (!payload.data?.userUid) return Promise.reject(new Error("Отсутствует userUid для ChatService.deleteRoom"))
    return this.service.deleteRoom(payload.data.userUid as UUID, payload.data)
  }

  private leaveRoom(payload: iContracts.iMicroServiceRequestPayload<iSharedChat.ChatRoomLeavePayloadDto & { userUid: string }>): Promise<iSharedChat.ChatRoomLeaveResponseDto> {
    if (!payload.data?.userUid) return Promise.reject(new Error("Отсутствует userUid для ChatService.leaveRoom"))
    return this.service.leaveRoom(payload.data.userUid as UUID, payload.data)
  }

  private sendMessage(payload: iContracts.iMicroServiceRequestPayload<iSharedChat.ChatMessageSendPayloadDto & { userUid: string }>): Promise<iSharedChat.ChatMessageSendResponseDto> {
    if (!payload.data?.userUid) return Promise.reject(new Error("Отсутствует userUid для ChatService.sendMessage"))
    return this.service.sendMessage(payload.data.userUid as UUID, payload.data)
  }

  private updateMessage(payload: iContracts.iMicroServiceRequestPayload<iSharedChat.ChatMessageUpdatePayloadDto & { userUid: string }>): Promise<iSharedChat.ChatMessageUpdateResponseDto> {
    if (!payload.data?.userUid) return Promise.reject(new Error("Отсутствует userUid для ChatService.updateMessage"))
    return this.service.updateMessage(payload.data.userUid as UUID, payload.data)
  }

  private deleteMessage(payload: iContracts.iMicroServiceRequestPayload<iSharedChat.ChatMessageDeletePayloadDto & { userUid: string }>): Promise<iSharedChat.ChatMessageDeleteResponseDto> {
    if (!payload.data?.userUid) return Promise.reject(new Error("Отсутствует userUid для ChatService.deleteMessage"))
    return this.service.deleteMessage(payload.data.userUid as UUID, payload.data)
  }

  private deleteMessageFile(payload: iContracts.iMicroServiceRequestPayload<iSharedChat.ChatMessageFileDeletePayloadDto & { userUid: string }>): Promise<iSharedChat.ChatMessageFileDeleteResponseDto> {
    if (!payload.data?.userUid) return Promise.reject(new Error("Отсутствует userUid для ChatService.deleteMessageFile"))
    return this.service.deleteMessageFile(payload.data.userUid as UUID, payload.data)
  }

  private assertRoomAccess(payload: iContracts.iMicroServiceRequestPayload<iSharedChat.ChatMessagesListPayloadDto & { userUid: string }>): Promise<{ allowed: true }> {
    if (!payload.data?.userUid) return Promise.reject(new Error("Отсутствует userUid для ChatService.assertRoomAccess"))
    return this.service.assertRoomAccess(payload.data.userUid as UUID, payload.data.roomUid)
      .then(() => ({ allowed: true }))
  }
}
