import { createApp } from 'vue'
import App from './App.vue'
import './registerServiceWorker'
import { store, key, router } from './entities'

const app = createApp(App)

app.use(store, key)
app.use(router)
app.mount('#app')
