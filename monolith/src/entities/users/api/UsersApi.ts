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

  listPermissions(): Promise<iSharedUser.ListPermissionsResponseDto> {
    return this.api.get<iSharedUser.ListPermissionsResponseDto>({
      path: "/users/permissions",
      commit: "users/setPermissions"
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

  createRole(payload: iSharedUserRole.CreateRolePayloadDto): Promise<iSharedUserRole.CreateRoleResponseDto> {
    return this.api.post<iSharedUserRole.CreateRoleResponseDto, iSharedUserRole.CreateRolePayloadDto>({
      path: "/users/roles",
      payload,
      commit: "users/addRole"
    })
  }

  updateRole(payload: iSharedUserRole.UpdateRolePayloadDto): Promise<iSharedUserRole.UpdateRoleResponseDto> {
    return this.api.patch<iSharedUserRole.UpdateRoleResponseDto, iSharedUserRole.UpdateRolePayloadDto>({
      path: "/users/roles",
      payload,
      commit: "users/updateRole"
    })
  }

  deleteRole(payload: iSharedUserRole.DeleteRolePayloadDto): Promise<iSharedUserRole.DeleteRoleResponseDto> {
    return this.api.delete<iSharedUserRole.DeleteRoleResponseDto, iSharedUserRole.DeleteRolePayloadDto>({
      path: "/users/roles",
      payload,
      commit: "users/deleteRole"
    })
  }

  updateRolePermissions(payload: iSharedUserRole.UpdateRolePermissionsPayloadDto): Promise<iSharedUserRole.UpdateRolePermissionsResponseDto> {
    return this.api.patch<iSharedUserRole.UpdateRolePermissionsResponseDto, iSharedUserRole.UpdateRolePermissionsPayloadDto>({
      path: "/users/roles/permissions",
      payload,
      commit: "users/updateRole"
    })
  }

  updateSuperadministratorUsers(payload: iSharedUser.UpdateSuperadministratorUsersPayloadDto): Promise<iSharedUser.UpdateSuperadministratorUsersResponseDto> {
    return this.api.patch<iSharedUser.UpdateSuperadministratorUsersResponseDto, iSharedUser.UpdateSuperadministratorUsersPayloadDto>({
      path: "/users/superadministrators",
      payload,
      commit: "users/setUsers"
    })
  }
}
