declare global {
  namespace iSharedChat {
    type ChatRoomType = "public" | "group" | "private"

    interface ChatRoomDto {
      uid: string
      type: ChatRoomType
      title: string
      createdAt: string
    }

    interface ChatFilePayloadDto {
      fileUid: string
    }

    interface ChatFileDto {
      uid: string
      fileUid: string
      originalName: string
      mimeType: string
      size: number
      description: string | null
      url: string
    }

    interface ChatMessageSenderDto {
      firstName: string
      lastName: string
    }

    interface ChatMessageDto {
      uid: string
      roomUid: string
      sender: ChatMessageSenderDto
      text: string | null
      files: ChatFileDto[]
      createdAt: string
    }

    interface ChatRoomsListResponseDto {
      rooms: ChatRoomDto[]
    }

    interface ChatMessagesListPayloadDto {
      roomUid: string
    }

    interface ChatMessagesListResponseDto {
      messages: ChatMessageDto[]
    }

    interface ChatRoomCreatePayloadDto {
      type: ChatRoomType
      title: string
      memberUserUids: string[]
    }

    interface ChatRoomCreateResponseDto {
      room: ChatRoomDto
    }

    interface ChatMessageSendPayloadDto {
      roomUid: string
      text?: string
      files?: ChatFilePayloadDto[]
    }

    interface ChatMessageSendResponseDto {
      message: ChatMessageDto
    }
  }
}

export { }
