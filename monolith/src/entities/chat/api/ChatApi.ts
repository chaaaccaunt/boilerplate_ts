import type { ApiRequester } from "@/shared/api"

export class ChatApi {
  constructor(private readonly api: ApiRequester) { }

  listRooms(): Promise<iSharedChat.ChatRoomsListResponseDto> {
    return this.api.get<iSharedChat.ChatRoomsListResponseDto>({
      path: "/chat/rooms"
    })
      .then((result) => {
        this.api.commit("chat/setRooms", result.rooms)

        return result
      })
  }

  listAvailableMembers(payload: iSharedChat.ChatAvailableMembersListPayloadDto = {}): Promise<iSharedChat.ChatAvailableMembersListResponseDto> {
    const search = new URLSearchParams()
    if (payload.limit !== undefined) search.set("limit", String(payload.limit))
    if (payload.offset !== undefined) search.set("offset", String(payload.offset))

    return this.api.get<iSharedChat.ChatAvailableMembersListResponseDto>({
      path: `/chat/members/available${search.size ? `?${search.toString()}` : ""}` as `/${string}`
    })
  }

  listMessages(payload: iSharedChat.ChatMessagesListPayloadDto): Promise<iSharedChat.ChatMessagesListResponseDto> {
    const search = new URLSearchParams({ roomUid: payload.roomUid })
    if (payload.limit !== undefined) search.set("limit", String(payload.limit))
    if (payload.offset !== undefined) search.set("offset", String(payload.offset))

    return this.api.get<iSharedChat.ChatMessagesListResponseDto>({
      path: `/chat/messages?${search.toString()}` as `/${string}`
    })
      .then((result) => {
        this.api.commit("chat/setMessages", {
          roomUid: payload.roomUid,
          ...result
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
