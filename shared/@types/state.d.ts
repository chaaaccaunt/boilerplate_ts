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

    interface RootState {
      authorization: AuthorizationState
      errors: ErrorsState
    }
  }
}

export { }

