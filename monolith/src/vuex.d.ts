import { Store } from 'vuex'

declare module 'vue' {
  interface ComponentCustomProperties {
    $store: Store<iSharedState.RootState>
  }
}
