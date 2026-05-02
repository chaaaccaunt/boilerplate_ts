import { Module, MutationTree } from "vuex"

const mutations: MutationTree<iSharedState.AuthState> = {
  setUser(state, user: iSharedUser.PublicUserDto) {
    state.user = user
    state.isAuthenticated = true
  },

  clearUser(state) {
    state.user = null
    state.isAuthenticated = false
  }
}

export const auth: Module<iSharedState.AuthState, iSharedState.RootState> = {
  namespaced: true,

  state: () => ({
    user: null,
    isAuthenticated: false
  }),

  mutations
}
