import type { ApiClient } from "@/application/api/ApiClient"

export class UsersApi {
  constructor(private readonly api: ApiClient) { }

  list(): Promise<iSharedUser.ListUsersResponseDto> {
    return this.api.get<iSharedUser.ListUsersResponseDto>({
      path: "/users",
      commit: "users/setUsers"
    })
  }

  listRoles(): Promise<iSharedUser.ListRolesResponseDto> {
    return this.api.get<iSharedUser.ListRolesResponseDto>({
      path: "/users/roles",
      commit: "users/setRoles"
    })
  }

  create(payload: iSharedUser.CreateUserPayloadDto): Promise<iSharedUser.CreateUserResponseDto> {
    return this.api.post<iSharedUser.CreateUserResponseDto, iSharedUser.CreateUserPayloadDto>({
      path: "/users",
      payload,
      commit: "users/addUser"
    })
  }
}
