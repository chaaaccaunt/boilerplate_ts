declare global {
  namespace iSharedRole {
    interface RoleDto {
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
      roles: iSharedRole.RoleDto[]
    }
  }
}

export { }
