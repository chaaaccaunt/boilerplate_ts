import { Module, MutationTree } from "vuex"

const mutations: MutationTree<iSharedState.SystemState> = {
  setMetrics(state, payload: iSharedSystem.RuntimeMetricsListResponseDto) {
    state.metrics = payload.items
  },

  setMetric(state, payload: iSharedSystem.RuntimeMetricsItemResponseDto) {
    const packageUid = payload.item.packageUid
    const index = state.metrics.findIndex((item) => item.packageUid === packageUid)

    if (index === -1) {
      state.metrics = state.metrics.concat(payload.item)
      return
    }

    state.metrics = state.metrics.map((item, itemIndex) => itemIndex === index ? payload.item : item)
  }
}

export const system: Module<iSharedState.SystemState, iSharedState.RootState> = {
  namespaced: true,

  state: () => ({
    metrics: []
  }),

  mutations
}

