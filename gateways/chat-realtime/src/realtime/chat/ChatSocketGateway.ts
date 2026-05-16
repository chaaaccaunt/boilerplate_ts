import { randomUUID } from "crypto"
import type { iWebSocketEvent, iWebSocketEventContext, iWebSocketGateway } from "@/libs"
import { InternalServiceClient } from "@/services/InternalServiceClient"
import {
  chatMessageSendScheme,
  chatMessagesListScheme,
  chatRoomCreateScheme,
  chatRoomJoinScheme
} from "./chat.socket-schemes"

export class ChatSocketGateway implements iWebSocketGateway {
  readonly name = "ChatSocketGateway"

  constructor(private readonly chatServiceClient: InternalServiceClient) { }

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
    return this.chatServiceClient.request<iSharedChat.ChatRoomsListResponseDto, { userUid: string }>({
      requestId: randomUUID(),
      path: "/chat/rooms/list",
      payload: { userUid: context.user.uid }
    })
      .then((result) => Promise.all(result.rooms.map((room) => context.socket.join(this.getRoomChannel(room.uid))))
        .then(() => result))
  }

  private createRoom(context: iWebSocketEventContext, payload: iSharedChat.ChatRoomCreatePayloadDto): Promise<iSharedChat.ChatRoomCreateResponseDto> {
    return this.chatServiceClient.request<iSharedChat.ChatRoomCreateResponseDto, iSharedChat.ChatRoomCreatePayloadDto & { userUid: string }>({
      requestId: randomUUID(),
      path: "/chat/rooms",
      payload: {
        ...payload,
        userUid: context.user.uid
      }
    })
      .then((result) => Promise.resolve(context.socket.join(this.getRoomChannel(result.room.uid)))
        .then(() => result))
  }

  private joinRoom(context: iWebSocketEventContext, payload: iSharedChat.ChatMessagesListPayloadDto): Promise<{ joined: true }> {
    return this.chatServiceClient.request<{ allowed: true }, iSharedChat.ChatMessagesListPayloadDto & { userUid: string }>({
      requestId: randomUUID(),
      path: "/chat/rooms/access",
      payload: {
        ...payload,
        userUid: context.user.uid
      }
    })
      .then(() => Promise.resolve(context.socket.join(this.getRoomChannel(payload.roomUid))))
      .then(() => ({ joined: true }))
  }

  private listMessages(context: iWebSocketEventContext, payload: iSharedChat.ChatMessagesListPayloadDto): Promise<iSharedChat.ChatMessagesListResponseDto> {
    return this.chatServiceClient.request<iSharedChat.ChatMessagesListResponseDto, iSharedChat.ChatMessagesListPayloadDto & { userUid: string }>({
      requestId: randomUUID(),
      path: "/chat/messages/list",
      payload: {
        ...payload,
        userUid: context.user.uid
      }
    })
  }

  private sendMessage(context: iWebSocketEventContext, payload: iSharedChat.ChatMessageSendPayloadDto): Promise<iSharedChat.ChatMessageSendResponseDto> {
    return this.chatServiceClient.request<iSharedChat.ChatMessageSendResponseDto, iSharedChat.ChatMessageSendPayloadDto & { userUid: string }>({
      requestId: randomUUID(),
      path: "/chat/messages",
      payload: {
        ...payload,
        userUid: context.user.uid
      }
    })
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
