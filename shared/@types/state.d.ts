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

    interface UsersState {
      users: iSharedUser.PublicUserDto[]
      roles: iSharedUserRole.UserRoleDto[]
    }

    interface ChatState {
      rooms: iSharedChat.ChatRoomDto[]
      activeRoomUid: string | null
      messagesByRoomUid: Record<string, iSharedChat.ChatMessageDto[]>
    }

    interface RootState {
      authorization: AuthorizationState
      users: UsersState
      chat: ChatState
      errors: ErrorsState
    }
  }
}

export { }

