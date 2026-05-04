<script lang="ts" setup>
import { computed, onMounted, reactive, ref } from "vue"
import { useApiClient, useStore } from "@/entities"

const apiClient = useApiClient()
const store = useStore()

const isLoading = ref(false)
const isSubmitting = ref(false)

const form = reactive({
  login: "",
  password: "",
  firstName: "",
  lastName: "",
  surname: "",
  roleNames: ["user"] as iSharedUserRole.UserRoleName[]
})

const users = computed(() => store.state.users.users)
const roles = computed(() => store.state.users.roles)

const canSubmit = computed(() => (
  form.login.trim().length > 0 &&
  form.password.length >= 8 &&
  form.firstName.trim().length > 0 &&
  form.lastName.trim().length > 0 &&
  form.roleNames.length > 0 &&
  !isSubmitting.value
))

onMounted(() => {
  isLoading.value = true
  Promise.all([
    apiClient.users.listRoles(),
    apiClient.users.list()
  ])
    .finally(() => {
      isLoading.value = false
    })
})

function createUser(): void {
  if (!canSubmit.value) return

  const payload: iSharedUser.CreateUserPayloadDto = {
    login: form.login.trim(),
    password: form.password,
    firstName: form.firstName.trim(),
    lastName: form.lastName.trim(),
    roleNames: form.roleNames
  }
  const surname = form.surname.trim()

  if (surname) {
    payload.surname = surname
  }

  isSubmitting.value = true
  apiClient.users.create(payload)
    .then(() => {
      form.login = ""
      form.password = ""
      form.firstName = ""
      form.lastName = ""
      form.surname = ""
      form.roleNames = ["user"]
    })
    .finally(() => {
      isSubmitting.value = false
    })
}

function toggleRole(roleName: iSharedUserRole.UserRoleName, checked: boolean): void {
  if (checked) {
    form.roleNames = Array.from(new Set([...form.roleNames, roleName]))
    return
  }

  form.roleNames = form.roleNames.filter((name) => name !== roleName)
}

function toggleRoleFromEvent(roleName: iSharedUserRole.UserRoleName, event: Event): void {
  const target = event.target

  if (!(target instanceof HTMLInputElement)) return

  toggleRole(roleName, target.checked)
}

function roleLabel(roleName: iSharedUserRole.UserRoleName): string {
  const labels: Record<iSharedUserRole.UserRoleName, string> = {
    administrator: "Администратор",
    user: "Пользователь"
  }

  return labels[roleName]
}
</script>

<template>
  <section class="users-view">
    <div class="users-view__content">
      <div class="users-view__header">
        <h1 class="h4 mb-0">Пользователи</h1>
      </div>

      <div class="users-view__grid">
        <section class="users-view__panel bg-white border">
          <h2 class="h6 mb-3">Новый пользователь</h2>

          <form class="users-view__form" @submit.prevent="createUser">
            <div>
              <label class="form-label" for="user-login">Логин</label>
              <input
                id="user-login"
                v-model="form.login"
                autocomplete="email"
                class="form-control"
                name="login"
                type="email"
              >
            </div>

            <div>
              <label class="form-label" for="user-password">Пароль</label>
              <input
                id="user-password"
                v-model="form.password"
                autocomplete="new-password"
                class="form-control"
                name="password"
                type="password"
              >
            </div>

            <div class="users-view__name-grid">
              <div>
                <label class="form-label" for="user-last-name">Фамилия</label>
                <input id="user-last-name" v-model="form.lastName" class="form-control" name="lastName" type="text">
              </div>

              <div>
                <label class="form-label" for="user-first-name">Имя</label>
                <input id="user-first-name" v-model="form.firstName" class="form-control" name="firstName" type="text">
              </div>
            </div>

            <div>
              <label class="form-label" for="user-surname">Отчество</label>
              <input id="user-surname" v-model="form.surname" class="form-control" name="surname" type="text">
            </div>

            <fieldset class="users-view__roles">
              <legend class="form-label">Роли</legend>

              <div class="users-view__role-options">
                <label v-for="role in roles" :key="role.uid" class="form-check">
                  <input
                    :checked="form.roleNames.includes(role.name)"
                    class="form-check-input"
                    type="checkbox"
                    @change="toggleRoleFromEvent(role.name, $event)"
                  >
                  <span class="form-check-label">{{ roleLabel(role.name) }}</span>
                </label>
              </div>
            </fieldset>

            <button class="btn btn-primary" :disabled="!canSubmit" type="submit">
              {{ isSubmitting ? "Создание..." : "Создать пользователя" }}
            </button>
          </form>
        </section>

        <section class="users-view__panel bg-white border">
          <div class="users-view__list-header">
            <h2 class="h6 mb-0">Список пользователей</h2>
            <span class="text-secondary small">{{ isLoading ? "Загрузка..." : users.length }}</span>
          </div>

          <div class="table-responsive">
            <table class="table align-middle mb-0">
              <thead>
                <tr>
                  <th scope="col">Пользователь</th>
                  <th scope="col">Логин</th>
                  <th scope="col">Роли</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="user in users" :key="user.uid">
                  <td>{{ user.fullName }}</td>
                  <td>{{ user.login }}</td>
                  <td>
                    <span
                      v-for="role in user.roles"
                      :key="role.uid"
                      class="badge text-bg-light border me-1"
                    >
                      {{ roleLabel(role.name) }}
                    </span>
                  </td>
                </tr>
                <tr v-if="!users.length && !isLoading">
                  <td class="text-secondary" colspan="3">Пользователи не найдены</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  </section>
</template>

<style lang="scss" scoped>
.users-view {
  min-height: calc(100vh - 57px);
  padding: 24px;
}

.users-view__content {
  display: grid;
  gap: 20px;
  max-width: 1180px;
}

.users-view__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-width: 0;
}

.users-view__grid {
  display: grid;
  grid-template-columns: minmax(280px, 380px) minmax(0, 1fr);
  gap: 20px;
}

.users-view__panel {
  min-width: 0;
  padding: 18px;
  border-radius: 8px;
}

.users-view__form {
  display: grid;
  gap: 14px;
}

.users-view__name-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.users-view__roles {
  min-width: 0;
}

.users-view__role-options {
  display: grid;
  gap: 8px;
}

.users-view__list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

@media (max-width: 992px) {
  .users-view__grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 576px) {
  .users-view {
    padding: 16px;
  }

  .users-view__name-grid {
    grid-template-columns: 1fr;
  }
}
</style>
