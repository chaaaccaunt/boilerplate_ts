import type { iWebSocketEvent, iWebSocketEventContext, iWebSocketGateway } from "@/libs"
import { ChatService } from "@/services/ChatService"
import {
  chatMessageSendScheme,
  chatMessagesListScheme,
  chatRoomCreateScheme,
  chatRoomJoinScheme
} from "./chat.socket-schemes"

export class ChatSocketGateway implements iWebSocketGateway {
  readonly name = "ChatSocketGateway"
  private readonly service: ChatService

  constructor(models: iDatabase.Models) {
    this.service = new ChatService(models)
  }

  getEvents(): readonly iWebSocketEvent[] {
    return [
      {
        name: "chat:rooms:list",
        handler: this.listRooms.bind(this)
      },
      {
        name: "chat:room:create",
        validator: chatRoomCreateScheme,
        handler: this.createRoom.bind(this)
      },
      {
        name: "chat:room:join",
        validator: chatRoomJoinScheme,
        handler: this.joinRoom.bind(this)
      },
      {
        name: "chat:messages:list",
        validator: chatMessagesListScheme,
        handler: this.listMessages.bind(this)
      },
      {
        name: "chat:message:send",
        validator: chatMessageSendScheme,
        handler: this.sendMessage.bind(this)
      }
    ]
  }

  private listRooms(context: iWebSocketEventContext): Promise<iSharedChat.ChatRoomsListResponseDto> {
    return this.service.listRooms(context.user.uid)
      .then((result) => Promise.all(result.rooms.map((room) => context.socket.join(this.getRoomChannel(room.uid))))
        .then(() => result))
  }

  private createRoom(context: iWebSocketEventContext, payload: iSharedChat.ChatRoomCreatePayloadDto): Promise<iSharedChat.ChatRoomCreateResponseDto> {
    return this.service.createRoom(context.user.uid, payload)
      .then((result) => Promise.resolve(context.socket.join(this.getRoomChannel(result.room.uid)))
        .then(() => result))
  }

  private joinRoom(context: iWebSocketEventContext, payload: iSharedChat.ChatMessagesListPayloadDto): Promise<{ joined: true }> {
    return this.service.assertRoomAccess(context.user.uid, payload.roomUid)
      .then(() => Promise.resolve(context.socket.join(this.getRoomChannel(payload.roomUid))))
      .then(() => ({ joined: true }))
  }

  private listMessages(context: iWebSocketEventContext, payload: iSharedChat.ChatMessagesListPayloadDto): Promise<iSharedChat.ChatMessagesListResponseDto> {
    return this.service.listMessages(context.user.uid, payload)
  }

  private sendMessage(context: iWebSocketEventContext, payload: iSharedChat.ChatMessageSendPayloadDto): Promise<iSharedChat.ChatMessageSendResponseDto> {
    return this.service.sendMessage(context.user.uid, payload)
      .then((result) => {
        context.socket
          .to(this.getRoomChannel(payload.roomUid))
          .emit("chat:message:created", {
            ok: true,
            result,
            error: null
          })

        return result
      })
  }

  private getRoomChannel(roomUid: string): string {
    return `chat:room:${roomUid}`
  }
}
