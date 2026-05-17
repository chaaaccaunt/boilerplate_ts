import type { ApiClient } from "@/application/api/ApiClient"

export class ChatApi {
  constructor(private readonly api: ApiClient) { }

  listRooms(): Promise<iSharedChat.ChatRoomsListResponseDto> {
    return this.api.get<iSharedChat.ChatRoomsListResponseDto>({
      path: "/chat/rooms"
    })
      .then((result) => {
        this.api.commit("chat/setRooms", result.rooms)

        return result
      })
  }

  listAvailableMembers(): Promise<iSharedChat.ChatAvailableMembersListResponseDto> {
    return this.api.get<iSharedChat.ChatAvailableMembersListResponseDto>({
      path: "/chat/members/available"
    })
  }

  listMessages(roomUid: string): Promise<iSharedChat.ChatMessagesListResponseDto> {
    return this.api.get<iSharedChat.ChatMessagesListResponseDto>({
      path: `/chat/messages?roomUid=${encodeURIComponent(roomUid)}` as `/${string}`
    })
      .then((result) => {
        this.api.commit("chat/setMessages", {
          roomUid,
          messages: result.messages
        })

        return result
      })
  }

  updateMessage(payload: iSharedChat.ChatMessageUpdatePayloadDto): Promise<iSharedChat.ChatMessageUpdateResponseDto> {
    return this.api.patch<iSharedChat.ChatMessageUpdateResponseDto, iSharedChat.ChatMessageUpdatePayloadDto>({
      path: "/chat/messages",
      payload,
      commit: "chat/updateMessage"
    })
  }

  deleteMessage(payload: iSharedChat.ChatMessageDeletePayloadDto): Promise<iSharedChat.ChatMessageDeleteResponseDto> {
    return this.api.delete<iSharedChat.ChatMessageDeleteResponseDto, iSharedChat.ChatMessageDeletePayloadDto>({
      path: "/chat/messages",
      payload,
      commit: "chat/deleteMessage"
    })
  }

  deleteMessageFile(payload: iSharedChat.ChatMessageFileDeletePayloadDto): Promise<iSharedChat.ChatMessageFileDeleteResponseDto> {
    return this.api.delete<iSharedChat.ChatMessageFileDeleteResponseDto, iSharedChat.ChatMessageFileDeletePayloadDto>({
      path: "/chat/messages/files",
      payload
    })
      .then((result) => {
        this.api.commit("chat/updateMessage", result.message)
        return result
      })
  }
}
