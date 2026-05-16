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
}
