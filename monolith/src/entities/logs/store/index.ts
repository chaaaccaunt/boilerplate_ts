import { Module, MutationTree } from "vuex"

const mutations: MutationTree<iSharedState.LogsState> = {
  setLogs(state, payload: iSharedLogs.LogsListResponseDto) {
    state.logs = payload.logs
    state.total = payload.total
    state.limit = payload.limit
    state.offset = payload.offset
  }
}

export const logs: Module<iSharedState.LogsState, iSharedState.RootState> = {
  namespaced: true,

  state: () => ({
    logs: [],
    total: 0,
    limit: 50,
    offset: 0
  }),

  mutations
}
