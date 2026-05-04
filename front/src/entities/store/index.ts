import { InjectionKey } from 'vue'
import { createStore, useStore as baseUseStore, Store } from 'vuex'
import { authorization, chat, errors, users } from './modules'

export const key: InjectionKey<Store<iSharedState.RootState>> = Symbol()

export const store = createStore<iSharedState.RootState>({
  modules: {
    authorization,
    users,
    chat,
    errors
  }
})

export function useStore() {
  return baseUseStore(key)
}

