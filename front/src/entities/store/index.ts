import { InjectionKey } from 'vue'
import { createStore, useStore as baseUseStore, Store } from 'vuex'
import { auth, errors } from './modules'

export const key: InjectionKey<Store<iSharedState.RootState>> = Symbol()

export const store = createStore<iSharedState.RootState>({
  modules: {
    auth,
    errors
  }
})

export function useStore() {
  return baseUseStore(key)
}
