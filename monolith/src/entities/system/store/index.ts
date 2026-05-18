import { Module, MutationTree } from "vuex"

const mutations: MutationTree<iSharedState.SystemState> = {
  setMetrics(state, payload: iSharedSystem.RuntimeMetricsListResponseDto) {
    state.metrics = payload.items
  }
}

export const system: Module<iSharedState.SystemState, iSharedState.RootState> = {
  namespaced: true,

  state: () => ({
    metrics: []
  }),

  mutations
}

