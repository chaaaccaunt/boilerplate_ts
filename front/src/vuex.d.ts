import { Store } from 'vuex'

declare module 'vue' {
  interface State {
    count: number
  }

  interface ComponentCustomProperties {
    $store: Store<State>
  }
}