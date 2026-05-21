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
  },

  applyPackageConnectionEvent(state, payload: iSharedLogs.RuntimePackageConnectionEventDto) {
    state.packageConnectionEvents = [payload].concat(state.packageConnectionEvents).slice(0, 50)
    state.metrics = state.metrics.map((item) => {
      if (item.packageUid !== payload.packageUid) return item

      const logRecord: iSharedLogs.LogRecordDto = {
        uid: `${payload.packageUid}:${payload.timestamp}:${payload.event}`,
        timestamp: payload.timestamp,
        kind: payload.event === "connected" ? "collector_connection" : "collector_disconnection",
        level: payload.level,
        source: payload.source,
        packageUid: payload.packageUid,
        message: payload.message,
        context: null
      }
      const logSummary = {
        ...item.logSummary,
        errorCount: payload.level === "error" ? item.logSummary.errorCount + 1 : item.logSummary.errorCount,
        warnCount: payload.level === "warn" ? item.logSummary.warnCount + 1 : item.logSummary.warnCount,
        logs: [logRecord].concat(item.logSummary.logs).slice(0, item.logSummary.limit)
      }

      if (payload.event === "disconnected") {
        return {
          packageUid: item.packageUid,
          source: item.source,
          status: "unavailable",
          reason: payload.message,
          checkedAt: payload.timestamp,
          logSummary
        }
      }

      return {
        ...item,
        logSummary
      }
    })
  }
}

export const system: Module<iSharedState.SystemState, iSharedState.RootState> = {
  namespaced: true,

  state: () => ({
    metrics: [],
    packageConnectionEvents: []
  }),

  mutations
}

