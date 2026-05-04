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
