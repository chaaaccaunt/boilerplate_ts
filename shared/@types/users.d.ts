declare global {
  namespace iSharedUserRole {
    type UserRoleName = string
    type SystemUserRoleName = "administrator" | "user"

    interface UserRoleDto {
      uid: string
      name: UserRoleName
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

    interface UserCreatedEventDto {
      user: PublicUserDto
    }

    interface ListUsersResponseDto {
      users: PublicUserDto[]
    }

    interface ListRolesResponseDto {
      roles: iSharedUserRole.UserRoleDto[]
    }
  }
}

export { }
