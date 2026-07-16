declare global {
  namespace iSharedPermission {
    type PermissionKey = string

    interface PermissionDto {
      uid: string
      key: PermissionKey
      title: string
      description: string | null
    }
  }

  namespace iSharedUserRole {
    type UserRoleName = string
    type SystemUserRoleName = "superadministrator"

    interface UserRoleDto {
      uid: string
      name: UserRoleName
      permissions: iSharedPermission.PermissionDto[]
    }

    interface CreateRolePayloadDto {
      name: UserRoleName
    }

    type CreateRoleResponseDto = UserRoleDto

    interface UpdateRolePayloadDto {
      uid: string
      name: UserRoleName
    }

    type UpdateRoleResponseDto = UserRoleDto

    interface DeleteRolePayloadDto {
      uid: string
    }

    interface DeleteRoleResponseDto {
      uid: string
    }

    interface UpdateRolePermissionsPayloadDto {
      uid: string
      permissionKeys: iSharedPermission.PermissionKey[]
    }

    type UpdateRolePermissionsResponseDto = UserRoleDto
  }

  namespace iSharedUser {
    interface PublicUserDto {
      uid: string
      login: string
      firstName: string
      lastName: string
      surname: string | null
      fullName: string
      roles: iSharedUserRole.UserRoleDto[]
      permissions: iSharedPermission.PermissionDto[]
    }

    interface CreateUserPayloadDto {
      login: string
      password: string
      firstName: string
      lastName: string
      surname?: string
      roleNames: iSharedUserRole.UserRoleName[]
    }

    type CreateUserResponseDto = PublicUserDto

    interface UpdateUserPayloadDto {
      uid: string
      login: string
      firstName: string
      lastName: string
      surname?: string
      roleNames: iSharedUserRole.UserRoleName[]
    }

    type UpdateUserResponseDto = PublicUserDto

    interface DeleteUserPayloadDto {
      uid: string
    }

    interface DeleteUserResponseDto {
      uid: string
    }

    interface UpdateSuperadministratorUsersPayloadDto {
      userUids: string[]
    }

    interface UpdateSuperadministratorUsersResponseDto {
      users: PublicUserDto[]
    }

    interface UserCreatedEventDto {
      user: PublicUserDto
    }

    interface ListUsersResponseDto {
      users: PublicUserDto[]
    }

    interface ListRolesResponseDto {
      roles: iSharedUserRole.UserRoleDto[]
    }

    interface ListPermissionsResponseDto {
      permissions: iSharedPermission.PermissionDto[]
    }
  }
}

export { }
