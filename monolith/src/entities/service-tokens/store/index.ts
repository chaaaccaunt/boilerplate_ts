import { Module, MutationTree } from "vuex"

const mutations: MutationTree<iSharedState.ServiceTokensState> = {
  setTokens(state, payload: iSharedServiceToken.ListServiceTokensResponseDto) {
    state.tokens = payload.tokens
  },

  addToken(state, token: iSharedServiceToken.ServiceTokenDto) {
    state.tokens = [token, ...state.tokens.filter((item) => item.uid !== token.uid)]
  },

  updateToken(state, token: iSharedServiceToken.ServiceTokenDto) {
    state.tokens = state.tokens.map((item) => item.uid === token.uid ? token : item)
  },

  deleteToken(state, payload: iSharedServiceToken.DeleteServiceTokenResponseDto) {
    state.tokens = state.tokens.filter((item) => item.uid !== payload.uid)
  }
}

export const serviceTokens: Module<iSharedState.ServiceTokensState, iSharedState.RootState> = {
  namespaced: true,

  state: () => ({
    tokens: []
  }),

  mutations
}
