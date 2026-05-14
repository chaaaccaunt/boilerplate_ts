import { ActionTree, Module, MutationTree } from "vuex"

type ErrorInput = Omit<iSharedState.ErrorItem, "uid" | "createdAt">

const mutations: MutationTree<iSharedState.ErrorsState> = {
  add(state, error) {
    state.items.push(error)
  },

  remove(state, uid) {
    state.items = state.items.filter((error) => error.uid !== uid)
  },

  clear(state) {
    state.items = []
  }
}

const actions: ActionTree<iSharedState.ErrorsState, iSharedState.RootState> = {
  add({ commit }, error: ErrorInput) {
    commit("add", {
      ...error,
      uid: createErrorUid(),
      createdAt: Date.now()
    } satisfies iSharedState.ErrorItem)
  },

  remove({ commit }, uid: string) {
    commit("remove", uid)
  },

  clear({ commit }) {
    commit("clear")
  }
}

export const errors: Module<iSharedState.ErrorsState, iSharedState.RootState> = {
  namespaced: true,

  state: () => ({
    items: []
  }),

  mutations,

  actions
}

function createErrorUid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}
