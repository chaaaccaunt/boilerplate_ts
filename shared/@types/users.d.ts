declare global {
  namespace iSharedUserRole {
    type UserRoleName = "administrator" | "user"

    interface UserRoleDto {
      uid: string
      name: UserRoleName
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
