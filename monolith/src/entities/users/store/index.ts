import { Module, MutationTree } from "vuex"

const mutations: MutationTree<iSharedState.UsersState> = {
  setUsers(state, payload: iSharedUser.ListUsersResponseDto) {
    state.users = payload.users
  },

  setRoles(state, payload: iSharedUser.ListRolesResponseDto) {
    state.roles = payload.roles
  },

  addUser(state, user: iSharedUser.PublicUserDto) {
    state.users = [user, ...state.users.filter((item) => item.uid !== user.uid)]
  },

  updateUser(state, user: iSharedUser.PublicUserDto) {
    state.users = state.users.map((item) => item.uid === user.uid ? user : item)
  },

  deleteUser(state, payload: iSharedUser.DeleteUserResponseDto) {
    state.users = state.users.filter((item) => item.uid !== payload.uid)
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
    roles: []
  }),

  mutations
}
