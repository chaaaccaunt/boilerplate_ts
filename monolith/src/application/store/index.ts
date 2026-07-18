import { InjectionKey } from 'vue'
import { createStore, useStore as baseUseStore, Store } from 'vuex'
import { authorization, chat, errors, files, logs, system, users } from './modules'

export const key: InjectionKey<Store<iSharedState.RootState>> = Symbol()

export const store = createStore<iSharedState.RootState>({
  modules: {
    authorization,
    users,
    chat,
    files,
    logs,
    system,
    errors
  }
})

export function useStore() {
  return baseUseStore(key)
}
