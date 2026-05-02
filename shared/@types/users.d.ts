declare global {
  namespace iSharedUser {
    interface PublicUserDto {
      uid: string
      login: string
      firstName: string
      lastName: string
      surname: string | null
      fullName: string
    }
  }
}

export { }
