<script lang="ts" setup>
import { PencilIcon, Trash2Icon } from "@lucide/vue"

defineProps<{
  users: iSharedUser.PublicUserDto[]
  canUpdateUsers: boolean
  canDeleteUsers: boolean
}>()

const emit = defineEmits<{
  (event: "edit", user: iSharedUser.PublicUserDto): void
  (event: "delete", user: iSharedUser.PublicUserDto): void
}>()
</script>

<template>
  <div class="space-y-3 sm:hidden">
    <article
      v-for="user in users"
      :key="user.uid"
      class="min-w-0 rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900"
    >
      <div class="flex min-w-0 items-start justify-between gap-3">
        <h3 class="min-w-0 break-words font-medium text-slate-950 dark:text-slate-50">
          {{ user.fullName }}
        </h3>
        <div v-if="canUpdateUsers || canDeleteUsers" class="flex shrink-0 gap-1">
          <button
            v-if="canUpdateUsers"
            class="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-50"
            type="button"
            :aria-label="`Редактировать пользователя ${user.fullName}`"
            @click="emit('edit', user)"
          >
            <PencilIcon class="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            v-if="canDeleteUsers"
            class="inline-flex h-9 w-9 items-center justify-center rounded-md text-red-500 transition hover:bg-red-50 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 dark:text-red-300 dark:hover:bg-red-950/40 dark:hover:text-red-200"
            type="button"
            :aria-label="`Удалить пользователя ${user.fullName}`"
            @click="emit('delete', user)"
          >
            <Trash2Icon class="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <dl class="mt-3 space-y-2 text-sm">
        <div class="grid min-w-0 grid-cols-[4rem_minmax(0,1fr)] gap-2">
          <dt class="text-slate-500 dark:text-slate-400">Логин</dt>
          <dd class="min-w-0 break-all text-slate-700 dark:text-slate-300">{{ user.login }}</dd>
        </div>
        <div class="grid min-w-0 grid-cols-[4rem_minmax(0,1fr)] gap-2">
          <dt class="text-slate-500 dark:text-slate-400">Роли</dt>
          <dd class="min-w-0 break-words text-slate-700 dark:text-slate-300">
            {{ user.roles.map((role) => role.name).join(", ") || "Нет ролей" }}
          </dd>
        </div>
      </dl>
    </article>

    <div
      v-if="!users.length"
      class="rounded-lg border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-900"
    >
      Пользователи не загружены
    </div>
  </div>

  <div class="hidden overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:block">
    <div class="overflow-x-auto">
      <table class="min-w-full divide-y divide-slate-200 text-left text-sm">
        <thead class="bg-slate-50 text-xs font-semibold uppercase text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          <tr>
            <th class="px-4 py-3">Пользователь</th>
            <th class="px-4 py-3">Логин</th>
            <th class="px-4 py-3">Роли</th>
            <th class="w-12 px-4 py-3">
              <span class="sr-only">Действия</span>
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-200 text-slate-700 dark:divide-slate-700 dark:text-slate-300">
          <tr v-for="user in users" :key="user.uid" class="hover:bg-slate-50 dark:hover:bg-slate-800">
            <td class="px-4 py-3 font-medium text-slate-950 dark:text-slate-50">{{ user.fullName }}</td>
            <td class="px-4 py-3">{{ user.login }}</td>
            <td class="px-4 py-3">{{ user.roles.map((role) => role.name).join(", ") }}</td>
            <td class="px-4 py-3 text-right">
              <div class="flex justify-end gap-1">
                <button
                  v-if="canUpdateUsers"
                  class="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-50"
                  type="button"
                  :aria-label="`Редактировать пользователя ${user.fullName}`"
                  @click="emit('edit', user)"
                >
                  <PencilIcon class="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  v-if="canDeleteUsers"
                  class="inline-flex h-9 w-9 items-center justify-center rounded-md text-red-500 transition hover:bg-red-50 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 dark:text-red-300 dark:hover:bg-red-950/40 dark:hover:text-red-200"
                  type="button"
                  :aria-label="`Удалить пользователя ${user.fullName}`"
                  @click="emit('delete', user)"
                >
                  <Trash2Icon class="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </td>
          </tr>
          <tr v-if="!users.length">
            <td class="px-4 py-8 text-center text-slate-500" colspan="4">
              Пользователи не загружены
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
