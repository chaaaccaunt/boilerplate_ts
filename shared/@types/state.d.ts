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
      permissions: iSharedPermission.PermissionDto[]
    }

    interface FilesState {
      owners: iSharedFiles.FileOwnerDto[]
      files: iSharedFiles.UploadedFileDto[]
      folders: iSharedFiles.FileFolderDto[]
      documents: iSharedFiles.StoredDocumentListItemDto[]
      currentOwner: iSharedFiles.FileOwnerDto | null
      currentFolder: iSharedFiles.FileFolderDto | null
      breadcrumbs: iSharedFiles.FileFolderDto[]
    }

    interface LogsState {
      logs: iSharedLogs.LogRecordDto[]
      total: number
      limit: number
      offset: number
    }

    interface SystemState {
      metrics: iSharedSystem.RuntimeMetricsItemDto[]
      packageConnectionEvents: iSharedLogs.RuntimePackageConnectionEventDto[]
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
      files: FilesState
      logs: LogsState
      system: SystemState
      errors: ErrorsState
    }
  }
}

export { }
