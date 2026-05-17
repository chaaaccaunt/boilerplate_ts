import { createRouter, createWebHistory, RouteRecordRaw, Router } from 'vue-router'
import { Store } from 'vuex'
import type { ApiClient } from '@/application/api/ApiClient'

const routes: Array<RouteRecordRaw> = [
  {
    path: '/login',
    name: 'login',
    meta: { requiresAuthorization: false },
    component: () => import(/* webpackChunkName: "login" */ '@/views/login/LoginView.vue')
  },
  {
    path: "/",
    redirect: { name: "home" }
  },
  {
    path: '/home',
    name: 'home',
    meta: { requiresAuthorization: true },
    component: () => import(/* webpackChunkName: "home" */ '@/views/home/HomeView.vue')
  },
  {
    path: '/chat',
    name: 'chat',
    meta: { requiresAuthorization: true },
    component: () => import(/* webpackChunkName: "chat" */ '@/views/chat/ChatView.vue')
  },
  {
    path: '/admin/chat-rooms',
    name: 'admin-chat-rooms',
    meta: { requiresAuthorization: true },
    component: () => import(/* webpackChunkName: "admin-chat-rooms" */ '@/views/chat-admin/ChatAdminRoomsView.vue')
  },
  {
    path: '/users',
    name: 'users',
    meta: { requiresAuthorization: true },
    component: () => import(/* webpackChunkName: "users" */ '@/views/users/UsersView.vue')
  },
  {
    path: '/files',
    name: 'files',
    meta: { requiresAuthorization: true },
    component: () => import(/* webpackChunkName: "files" */ '@/views/files/FilesView.vue')
  },
  {
    path: '/settings',
    name: 'settings',
    meta: { requiresAuthorization: true },
    component: () => import(/* webpackChunkName: "settings" */ '@/views/settings/SettingsView.vue')
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

