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

  update(payload: iSharedUser.UpdateUserPayloadDto): Promise<iSharedUser.UpdateUserResponseDto> {
    return this.api.patch<iSharedUser.UpdateUserResponseDto, iSharedUser.UpdateUserPayloadDto>({
      path: "/users",
      payload,
      commit: "users/updateUser"
    })
  }

  delete(payload: iSharedUser.DeleteUserPayloadDto): Promise<iSharedUser.DeleteUserResponseDto> {
    return this.api.delete<iSharedUser.DeleteUserResponseDto, iSharedUser.DeleteUserPayloadDto>({
      path: "/users",
      payload,
      commit: "users/deleteUser"
    })
  }
}
