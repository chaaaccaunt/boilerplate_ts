import { randomUUID } from "crypto"
import type { iWebSocketEvent, iWebSocketEventContext, iWebSocketGateway } from "@/libs"
import { InternalServiceClient } from "@/services/InternalServiceClient"
import {
  chatMessageDeleteScheme,
  chatMessageFileDeleteScheme,
  chatMessageSendScheme,
  chatMessageUpdateScheme,
  chatMessagesListScheme,
  chatRoomCreateScheme,
  chatRoomDeleteScheme,
  chatRoomJoinScheme,
  chatRoomLeaveScheme,
  chatRoomUpdateScheme
} from "./chat.socket-schemes"

export class ChatSocketGateway implements iWebSocketGateway {
  readonly name = "ChatSocketGateway"
  private readonly removedLinkText = "Ссылка удалена из соображений безопасности"

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
        name: "chat:room:update",
        validator: chatRoomUpdateScheme,
        handler: this.updateRoom.bind(this)
      },
      {
        name: "chat:room:delete",
        validator: chatRoomDeleteScheme,
        handler: this.deleteRoom.bind(this)
      },
      {
        name: "chat:room:leave",
        validator: chatRoomLeaveScheme,
        handler: this.leaveRoom.bind(this)
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
      },
      {
        name: "chat:message:update",
        validator: chatMessageUpdateScheme,
        handler: this.updateMessage.bind(this)
      },
      {
        name: "chat:message:delete",
        validator: chatMessageDeleteScheme,
        handler: this.deleteMessage.bind(this)
      },
      {
        name: "chat:message:file:delete",
        validator: chatMessageFileDeleteScheme,
        handler: this.deleteMessageFile.bind(this)
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

  private updateRoom(context: iWebSocketEventContext, payload: iSharedChat.ChatRoomUpdatePayloadDto): Promise<iSharedChat.ChatRoomUpdateResponseDto> {
    return this.chatServiceClient.request<iSharedChat.ChatRoomUpdateResponseDto, iSharedChat.ChatRoomUpdatePayloadDto & { userUid: string }>({
      requestId: randomUUID(),
      path: "/chat/rooms/update",
      payload: {
        ...payload,
        userUid: context.user.uid
      }
    })
      .then((result) => {
        context.socket
          .to(this.getRoomChannel(result.room.uid))
          .emit("chat:room:updated", {
            ok: true,
            result,
            error: null
          })

        return result
      })
  }

  private deleteRoom(context: iWebSocketEventContext, payload: iSharedChat.ChatRoomDeletePayloadDto): Promise<iSharedChat.ChatRoomDeleteResponseDto> {
    return this.chatServiceClient.request<iSharedChat.ChatRoomDeleteResponseDto, iSharedChat.ChatRoomDeletePayloadDto & { userUid: string }>({
      requestId: randomUUID(),
      path: "/chat/rooms/delete",
      payload: {
        ...payload,
        userUid: context.user.uid
      }
    })
      .then((result) => {
        context.socket
          .to(this.getRoomChannel(payload.roomUid))
          .emit("chat:room:deleted", {
            ok: true,
            result,
            error: null
          })
        context.socket.leave(this.getRoomChannel(payload.roomUid))

        return result
      })
  }

  private leaveRoom(context: iWebSocketEventContext, payload: iSharedChat.ChatRoomLeavePayloadDto): Promise<iSharedChat.ChatRoomLeaveResponseDto> {
    return this.chatServiceClient.request<iSharedChat.ChatRoomLeaveResponseDto, iSharedChat.ChatRoomLeavePayloadDto & { userUid: string }>({
      requestId: randomUUID(),
      path: "/chat/rooms/leave",
      payload: {
        ...payload,
        userUid: context.user.uid
      }
    })
      .then((result) => Promise.resolve(context.socket.leave(this.getRoomChannel(payload.roomUid)))
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
    const safePayload = this.sanitizeMessagePayload(context, payload)

    return this.chatServiceClient.request<iSharedChat.ChatMessageSendResponseDto, iSharedChat.ChatMessageSendPayloadDto & { userUid: string }>({
      requestId: randomUUID(),
      path: "/chat/messages",
      payload: {
        ...safePayload,
        userUid: context.user.uid
      }
    })
      .then((result) => {
        context.socket
          .to(this.getRoomChannel(safePayload.roomUid))
          .emit("chat:message:created", {
            ok: true,
            result: {
              message: {
                ...result.message,
                isOwn: false
              }
            },
            error: null
          })

        return result
      })
  }

  private updateMessage(context: iWebSocketEventContext, payload: iSharedChat.ChatMessageUpdatePayloadDto): Promise<iSharedChat.ChatMessageUpdateResponseDto> {
    const safePayload = this.sanitizeMessagePayload(context, payload)

    return this.chatServiceClient.request<iSharedChat.ChatMessageUpdateResponseDto, iSharedChat.ChatMessageUpdatePayloadDto & { userUid: string }>({
      requestId: randomUUID(),
      path: "/chat/messages/update",
      payload: {
        ...safePayload,
        userUid: context.user.uid
      }
    })
      .then((result) => {
        context.socket
          .to(this.getRoomChannel(result.message.roomUid))
          .emit("chat:message:updated", {
            ok: true,
            result: {
              message: {
                ...result.message,
                isOwn: false
              }
            },
            error: null
          })

        return result
      })
  }

  private deleteMessage(context: iWebSocketEventContext, payload: iSharedChat.ChatMessageDeletePayloadDto): Promise<iSharedChat.ChatMessageDeleteResponseDto> {
    return this.chatServiceClient.request<iSharedChat.ChatMessageDeleteResponseDto, iSharedChat.ChatMessageDeletePayloadDto & { userUid: string }>({
      requestId: randomUUID(),
      path: "/chat/messages/delete",
      payload: {
        ...payload,
        userUid: context.user.uid
      }
    })
      .then((result) => {
        context.socket
          .to(this.getRoomChannel(result.roomUid))
          .emit("chat:message:deleted", {
            ok: true,
            result,
            error: null
          })

        return result
      })
  }

  private deleteMessageFile(context: iWebSocketEventContext, payload: iSharedChat.ChatMessageFileDeletePayloadDto): Promise<iSharedChat.ChatMessageFileDeleteResponseDto> {
    return this.chatServiceClient.request<iSharedChat.ChatMessageFileDeleteResponseDto, iSharedChat.ChatMessageFileDeletePayloadDto & { userUid: string }>({
      requestId: randomUUID(),
      path: "/chat/messages/files/delete",
      payload: {
        ...payload,
        userUid: context.user.uid
      }
    })
      .then((result) => {
        context.socket
          .to(this.getRoomChannel(result.message.roomUid))
          .emit("chat:message:updated", {
            ok: true,
            result: {
              message: {
                ...result.message,
                isOwn: false
              }
            },
            error: null
          })

        return result
      })
  }

  private getRoomChannel(roomUid: string): string {
    return `chat:room:${roomUid}`
  }

  private sanitizeMessagePayload<TPayload extends { text?: string }>(context: iWebSocketEventContext, payload: TPayload): TPayload {
    if (typeof payload.text !== "string") return payload

    return {
      ...payload,
      text: this.sanitizeMessageText(context, payload.text)
    }
  }

  private sanitizeMessageText(context: iWebSocketEventContext, text: string): string {
    return text.replace(/https?:\/\/[^\s]+/g, (url) => {
      return this.isAllowedOwnLink(context, url) ? url : this.removedLinkText
    })
  }

  private isAllowedOwnLink(context: iWebSocketEventContext, value: string): boolean {
    try {
      const url = new URL(value)
      const requestHost = this.getRequestHost(context)

      return (
        Boolean(requestHost) &&
        url.protocol === "https:" &&
        url.host === requestHost &&
        url.pathname.startsWith("/v1/")
      )
    } catch {
      return false
    }
  }

  private getRequestHost(context: iWebSocketEventContext): string | null {
    const forwardedHost = context.socket.handshake.headers["x-forwarded-host"]
    const host = Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost || context.socket.handshake.headers.host

    return typeof host === "string" && host.trim() ? host.trim() : null
  }
}
