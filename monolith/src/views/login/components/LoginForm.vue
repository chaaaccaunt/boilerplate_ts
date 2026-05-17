<script lang="ts" setup>
import { computed, ref } from "vue"
import { useRoute, useRouter } from "vue-router"
import { LogInIcon } from "@lucide/vue"
import { useApiClient } from "@/application/api"
import { ApiError } from "@/shared/api"

const apiClient = useApiClient()
const route = useRoute()
const router = useRouter()

const login = ref("")
const password = ref("")
const isSubmitting = ref(false)
const errorMessage = ref("")

const canSubmit = computed(() => Boolean(login.value.trim() && password.value && !isSubmitting.value))

function submit(): void {
  if (!canSubmit.value) return

  errorMessage.value = ""
  isSubmitting.value = true

  apiClient.authorization.login({
    login: login.value.trim(),
    password: password.value
  })
    .then(() => {
      const redirect = typeof route.query.redirect === "string" ? route.query.redirect : "/home"
      return router.replace(redirect)
    })
    .catch((error) => {
      errorMessage.value = error instanceof ApiError ? error.message : "Не удалось войти в приложение"
    })
    .finally(() => {
      isSubmitting.value = false
    })
}
</script>

<template>
  <form class="w-full rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900" @submit.prevent="submit">
    <h1 class="mb-6 text-2xl font-semibold text-slate-950 dark:text-slate-50">Вход</h1>

    <div v-if="errorMessage" class="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
      {{ errorMessage }}
    </div>

    <div class="mb-4">
      <label class="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200" for="login">Логин</label>
      <input
        id="login"
        v-model="login"
        class="h-10 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50 dark:focus:ring-blue-950"
        type="email"
        autocomplete="username"
        required
      >
    </div>

    <div class="mb-6">
      <label class="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200" for="password">Пароль</label>
      <input
        id="password"
        v-model="password"
        class="h-10 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50 dark:focus:ring-blue-950"
        type="password"
        autocomplete="current-password"
        required
      >
    </div>

    <button
      class="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-md bg-blue-600 px-4 text-sm font-medium text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
      type="submit"
      :disabled="!canSubmit"
    >
      <LogInIcon class="h-4 w-4" aria-hidden="true" />
      {{ isSubmitting ? "Вход..." : "Войти" }}
    </button>
  </form>
</template>
