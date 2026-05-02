<script lang="ts" setup>
import { computed, reactive, ref } from "vue"
import { useRouter } from "vue-router"
import { useApiClient } from "@/entities"
import { ApiError } from "@/shared/api"

const router = useRouter()
const apiClient = useApiClient()

const form = reactive<iSharedAuthorization.LoginPayloadDto>({
  login: "",
  password: ""
})
const isSubmitting = ref(false)
const errorMessage = ref<string | null>(null)

const canSubmit = computed(() => {
  return Boolean(form.login.trim() && form.password.trim() && !isSubmitting.value)
})

async function submit() {
  if (!canSubmit.value) return

  isSubmitting.value = true
  errorMessage.value = null

  try {
    await apiClient.authorization.login(form)
    await router.push({ name: "home" })
  } catch (error) {
    errorMessage.value = getLoginErrorMessage(error)
  } finally {
    isSubmitting.value = false
  }
}

function getLoginErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error) return error.message
  return "Не удалось войти"
}
</script>

<template>
  <section class="login-view w-100">
    <form class="card shadow-sm border-0" @submit.prevent="submit">
      <header class="card-header bg-white border-0 pt-4 px-4">
        <h1 class="h4 mb-0">Вход</h1>
      </header>

      <div class="card-body p-4 d-grid gap-3">
        <div>
          <label class="form-label" for="login-email">Электронная почта</label>
          <input
            id="login-email"
            v-model.trim="form.login"
            autocomplete="username"
            class="form-control"
            name="login"
            type="email"
          >
        </div>

        <div>
          <label class="form-label" for="login-password">Пароль</label>
          <input
            id="login-password"
            v-model="form.password"
            autocomplete="current-password"
            class="form-control"
            name="password"
            type="password"
          >
        </div>

        <div v-if="errorMessage" class="alert alert-danger mb-0" role="alert">
          {{ errorMessage }}
        </div>

        <button :disabled="!canSubmit" class="btn btn-primary w-100" type="submit">
          <span
            v-if="isSubmitting"
            aria-hidden="true"
            class="spinner-border spinner-border-sm me-2"
          ></span>
          {{ isSubmitting ? "Входим" : "Войти" }}
        </button>
      </div>
    </form>
  </section>
</template>

<style lang="scss" scoped>
.login-view {
  width: min(100%, 360px);
}
</style>

