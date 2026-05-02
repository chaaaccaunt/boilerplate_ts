import { createApp } from 'vue'
import 'bootstrap/dist/css/bootstrap.min.css'
import App from './App.vue'
import { apiClientKey, createApiClient, store, key, router, registerRouterGuards } from './entities'
import './registerServiceWorker'

const app = createApp(App)
const apiClient = createApiClient(store)

registerRouterGuards(router, apiClient, store)

app.use(store, key)
app.use(router)
app.provide(apiClientKey, apiClient)
app.mount('#app')
