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
    path: "/files",
    name: "files",
    meta: { requiresAuthorization: true },
    component: () => import(/* webpackChunkName: "files" */ "@/views/files/FilesView.vue")
  },
  {
    path: "/media",
    name: "media",
    meta: { requiresAuthorization: true },
    component: () => import(/* webpackChunkName: "media" */ "@/views/media/MediaView.vue")
  },
  {
    path: "/files/my",
    name: "files-my",
    meta: { requiresAuthorization: true },
    component: () => import(/* webpackChunkName: "files" */ "@/views/files/FilesView.vue")
  },
  {
    path: "/files/users/:userUid",
    name: "files-user",
    meta: { requiresAuthorization: true },
    component: () => import(/* webpackChunkName: "files" */ "@/views/files/FilesView.vue")
  },
  {
    path: "/files/documents/:documentUid",
    name: "files-document",
    meta: { requiresAuthorization: true },
    component: () => import(/* webpackChunkName: "files" */ "@/views/files/DocumentEditorView.vue")
  },
  {
    path: '/users',
    name: 'users',
    meta: { requiresAuthorization: true, allowedPermissions: ["users.read", "users.create", "users.update", "users.delete", "roles.read", "roles.create", "roles.update", "roles.delete", "roles.permissions.manage"], allowedRoles: ["superadministrator"] },
    component: () => import(/* webpackChunkName: "users" */ '@/views/users/UsersView.vue')
  },
  {
    path: "/system",
    meta: { requiresAuthorization: true, allowedPermissions: ["system.metrics.read", "logs.read"], allowedRoles: ["superadministrator"] },
    component: () => import(/* webpackChunkName: "system" */ "@/views/system/SystemView.vue"),
    children: [
      {
        path: "",
        name: "system",
        component: () => import(/* webpackChunkName: "system" */ "@/views/system/SystemMetricsView.vue")
      },
      {
        path: "packages/:packageUid/logs",
        name: "system-package-logs",
        component: () => import(/* webpackChunkName: "logs" */ "@/views/logs/LogsView.vue")
      }
    ]
  },
  {
    path: '/settings',
    name: 'settings',
    meta: { requiresAuthorization: true },
    component: () => import(/* webpackChunkName: "settings" */ '@/views/settings/SettingsView.vue')
  },
  {
    path: "/:pathMatch(.*)*",
    name: "not-found",
    meta: { requiresAuthorization: true },
    component: () => import(/* webpackChunkName: "not-found" */ "@/views/not-found/NotFoundView.vue")
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
      if (!hasAllowedAccess(store, to.meta.allowedPermissions, to.meta.allowedRoles)) {
        return { name: "home" }
      }

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

function hasAllowedAccess(store: Store<iSharedState.RootState>, allowedPermissions: unknown, allowedRoles: unknown): boolean {
  if (hasAllowedPermission(store, allowedPermissions)) return true
  return hasAllowedRole(store, allowedRoles)
}

function hasAllowedPermission(store: Store<iSharedState.RootState>, allowedPermissions: unknown): boolean {
  if (!Array.isArray(allowedPermissions) || !allowedPermissions.length) return false

  const userPermissions = store.state.authorization.user?.permissions.map((permission) => permission.key) || []
  return allowedPermissions.some((permissionKey) => typeof permissionKey === "string" && userPermissions.includes(permissionKey))
}

function hasAllowedRole(store: Store<iSharedState.RootState>, allowedRoles: unknown): boolean {
  if (!Array.isArray(allowedRoles) || !allowedRoles.length) return true

  const userRoles = store.state.authorization.user?.roles.map((role) => role.name) || []
  return allowedRoles.some((roleName) => typeof roleName === "string" && userRoles.includes(roleName as iSharedUserRole.UserRoleName))
}
