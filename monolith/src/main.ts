import { createApp } from 'vue'
import './assets/styles/tailwind.css'
import App from './App.vue'
import { apiClientKey, createApiClient } from './application/api'
import { createWebSocketClient, webSocketClientKey } from './application/realtime'
import { registerRouterGuards, router } from './application/router'
import { key, store } from './application/store'
import { restoreAuthorizationFromPublicUserCookie } from './entities/authorization'
import './registerServiceWorker'

const app = createApp(App)
const apiClient = createApiClient(store)
const webSocketClient = createWebSocketClient()

restoreAuthorizationFromPublicUserCookie(store)
registerRouterGuards(router, apiClient, store)

app.use(store, key)
app.use(router)
app.provide(apiClientKey, apiClient)
app.provide(webSocketClientKey, webSocketClient)
app.mount('#app')
