declare global {
  namespace iSharedChat {
    type ChatRoomType = "public" | "group" | "private"
    type ChatRoomStatus = "active" | "archived_by_owner" | "orphaned"

    interface ChatRoomDto {
      uid: string
      type: ChatRoomType
      status: ChatRoomStatus
      title: string
      createdByUserUid: string | null
      memberUserUids: string[]
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
      viewUrl: string | null
      previewUrl: string | null
    }

    interface ChatMessageSenderDto {
      firstName: string
      lastName: string
    }

    interface ChatMessageDto {
      uid: string
      roomUid: string
      sender: ChatMessageSenderDto
      isOwn: boolean
      text: string | null
      files: ChatFileDto[]
      createdAt: string
      updatedAt: string
    }

    interface ChatRoomsListResponseDto {
      rooms: ChatRoomDto[]
    }

    interface ChatClosedRoomsListResponseDto {
      rooms: ChatRoomDto[]
    }

    interface ChatMessagesListPayloadDto {
      roomUid: string
    }

    interface ChatMessagesListResponseDto {
      messages: ChatMessageDto[]
    }

    interface ChatAdminMessagesListPayloadDto {
      roomUid: string
    }

    interface ChatAdminHardDeleteRoomPayloadDto {
      roomUid: string
    }

    interface ChatAdminHardDeleteRoomResponseDto {
      roomUid: string
    }

    interface ChatAvailableMembersListResponseDto {
      users: iSharedUser.PublicUserDto[]
    }

    interface ChatRoomCreatePayloadDto {
      memberUserUids: string[]
    }

    interface ChatRoomCreateResponseDto {
      room: ChatRoomDto
    }

    interface ChatRoomUpdatePayloadDto {
      roomUid: string
      title: string
      memberUserUids: string[]
    }

    interface ChatRoomUpdateResponseDto {
      room: ChatRoomDto
    }

    interface ChatRoomDeletePayloadDto {
      roomUid: string
    }

    interface ChatRoomDeleteResponseDto {
      roomUid: string
    }

    interface ChatRoomLeavePayloadDto {
      roomUid: string
    }

    interface ChatRoomLeaveResponseDto {
      roomUid: string
      closedForUser: true
    }

    interface ChatMessageSendPayloadDto {
      roomUid: string
      text?: string
      files?: ChatFilePayloadDto[]
    }

    interface ChatMessageSendResponseDto {
      message: ChatMessageDto
    }

    interface ChatMessageUpdatePayloadDto {
      messageUid: string
      text?: string
      files?: ChatFilePayloadDto[]
    }

    interface ChatMessageUpdateResponseDto {
      message: ChatMessageDto
    }

    interface ChatMessageDeletePayloadDto {
      messageUid: string
    }

    interface ChatMessageDeleteResponseDto {
      messageUid: string
      roomUid: string
    }

    interface ChatMessageFileDeletePayloadDto {
      messageUid: string
      fileUid: string
    }

    interface ChatMessageFileDeleteResponseDto {
      message: ChatMessageDto
      fileUid: string
    }
  }
}

export { }
