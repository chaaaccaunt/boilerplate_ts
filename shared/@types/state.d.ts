declare global {
  namespace iSharedState {
    interface AuthorizationState {
      user: iSharedUser.PublicUserDto | null
      isAuthenticated: boolean
    }

    interface ErrorItem {
      uid: string
      code: string
      message: string
      status: number
      createdAt: number
    }

    interface ErrorsState {
      items: ErrorItem[]
    }

    interface ChatState {
      rooms: iSharedChat.ChatRoomDto[]
      activeRoomUid: string | null
      messagesByRoomUid: Record<string, iSharedChat.ChatMessageDto[]>
    }

    interface RootState {
      authorization: AuthorizationState
      chat: ChatState
      errors: ErrorsState
    }
  }
}

export { }

