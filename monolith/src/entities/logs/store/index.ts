import { Module, MutationTree } from "vuex"

const mutations: MutationTree<iSharedState.LogsState> = {
  setLogs(state, payload: iSharedLogs.LogsListResponseDto) {
    state.logs = payload.logs
  }
}

export const logs: Module<iSharedState.LogsState, iSharedState.RootState> = {
  namespaced: true,

  state: () => ({
    logs: []
  }),

  mutations
}
