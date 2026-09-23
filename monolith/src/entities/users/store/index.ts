import { Module, MutationTree } from "vuex"

const mutations: MutationTree<iSharedState.UsersState> = {
  setUsers(state, payload: iSharedUser.ListUsersResponseDto) {
    state.users = payload.users
    state.total = payload.total
    state.limit = payload.limit
    state.offset = payload.offset
  },

  setRoles(state, payload: iSharedUser.ListRolesResponseDto) {
    state.roles = payload.roles
  },

  setPermissions(state, payload: iSharedUser.ListPermissionsResponseDto) {
    state.permissions = payload.permissions
  },

  addUser(state, user: iSharedUser.PublicUserDto) {
    state.users = [user, ...state.users.filter((item) => item.uid !== user.uid)]
      .slice(0, state.limit)
    state.total += 1
  },

  updateUser(state, user: iSharedUser.PublicUserDto) {
    state.users = state.users.map((item) => item.uid === user.uid ? user : item)
  },

  deleteUser(state, payload: iSharedUser.DeleteUserResponseDto) {
    state.users = state.users.filter((item) => item.uid !== payload.uid)
    state.total = Math.max(0, state.total - 1)
  },

  addRole(state, role: iSharedUserRole.UserRoleDto) {
    state.roles = [...state.roles.filter((item) => item.uid !== role.uid), role]
      .sort((left, right) => left.name.localeCompare(right.name))
  },

  updateRole(state, role: iSharedUserRole.UserRoleDto) {
    state.roles = state.roles.map((item) => item.uid === role.uid ? role : item)
      .sort((left, right) => left.name.localeCompare(right.name))
    state.users = state.users.map((user) => ({
      ...user,
      roles: user.roles.map((item) => item.uid === role.uid ? role : item)
    }))
  },

  deleteRole(state, payload: iSharedUserRole.DeleteRoleResponseDto) {
    state.roles = state.roles.filter((item) => item.uid !== payload.uid)
    state.users = state.users.map((user) => ({
      ...user,
      roles: user.roles.filter((role) => role.uid !== payload.uid)
    }))
  }
}

export const users: Module<iSharedState.UsersState, iSharedState.RootState> = {
  namespaced: true,

  state: () => ({
    users: [],
    total: 0,
    limit: 25,
    offset: 0,
    roles: [],
    permissions: []
  }),

  mutations
}
