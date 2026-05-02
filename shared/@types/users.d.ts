declare global {
  namespace iSharedUserRole {
    interface UserRoleDto {
      uid: string
      name: string
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
  }
}

export { }
