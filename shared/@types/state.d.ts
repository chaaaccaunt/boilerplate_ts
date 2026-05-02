declare global {
  namespace iSharedState {
    interface AuthState {
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
      auth: AuthState
      errors: ErrorsState
    }
  }
}

export { }
