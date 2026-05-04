import { createRouter, createWebHistory, RouteRecordRaw, Router } from 'vue-router'
import { Store } from 'vuex'
import type { ApiClient } from '@/entities/api/ApiClient'

const routes: Array<RouteRecordRaw> = [
  {
    path: '/login',
    name: 'login',
    meta: { requiresAuthorization: false },
    component: () => import(/* webpackChunkName: "login" */ '@/views/LoginView.vue')
  },
  {
    path: "/",
    redirect: { name: "home" }
  },
  {
    path: '/home',
    name: 'home',
    meta: { requiresAuthorization: true },
    component: () => import(/* webpackChunkName: "home" */ '@/views/HomeView.vue')
  },
  {
    path: '/chat',
    name: 'chat',
    meta: { requiresAuthorization: true },
    component: () => import(/* webpackChunkName: "chat" */ '@/views/ChatView.vue')
  }
]

export const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes
})

export function registerRouterGuards(
  routerInstance: Router,
  apiClient: ApiClient,
  store: Store<iSharedState.RootState>
): void {
  routerInstance.beforeEach(async (to) => {
    if (!to.meta.requiresAuthorization) return true

    try {
      await apiClient.authorization.state()
      return true
    } catch (error) {
      store.commit("authorization/clearUser")
      return {
        name: "login",
        query: {
          redirect: to.fullPath
        }
      }
    }
  })
}

