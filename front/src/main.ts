import { createApp } from 'vue'
import 'bootstrap/dist/css/bootstrap.min.css'
import App from './App.vue'
import {
  apiClientKey,
  createApiClient,
  createWebSocketClient,
  key,
  registerRouterGuards,
  router,
  store,
  webSocketClientKey
} from './entities'
import './registerServiceWorker'

const app = createApp(App)
const apiClient = createApiClient(store)
const webSocketClient = createWebSocketClient()

registerRouterGuards(router, apiClient, store)

app.use(store, key)
app.use(router)
app.provide(apiClientKey, apiClient)
app.provide(webSocketClientKey, webSocketClient)
app.mount('#app')
