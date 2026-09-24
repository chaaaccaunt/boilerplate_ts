<script lang="ts" setup>
import { onMounted, ref } from "vue"
import { useApiClient } from "@/application/api"

const api = useApiClient()
const notifications = ref<iSharedNotifications.NotificationDto[]>([])
const loading = ref(true)

function load(): void {
  loading.value = true
  api.notifications.list().then((result) => { notifications.value = result.notifications }).finally(() => { loading.value = false })
}

function markRead(item: iSharedNotifications.NotificationDto): void {
  if (item.readAt) return
  api.notifications.markRead(item.uid).then(load)
}

function markAllRead(): void { api.notifications.markAllRead().then(load) }

onMounted(load)
</script>

<template>
  <section class="min-h-full bg-slate-50 p-4 dark:bg-slate-950 lg:p-6">
    <div class="mx-auto max-w-4xl">
      <header class="mb-5 flex items-center justify-between gap-3">
        <h1 class="text-2xl font-semibold">Уведомления</h1>
        <button class="rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700" type="button" @click="markAllRead">Прочитать все</button>
      </header>
      <div class="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <p v-if="loading" class="p-5 text-sm text-slate-500">Загрузка...</p>
        <p v-else-if="!notifications.length" class="p-5 text-sm text-slate-500">Уведомлений пока нет.</p>
        <button v-for="item in notifications" v-else :key="item.uid" class="block w-full border-b border-slate-200 p-5 text-left last:border-b-0 dark:border-slate-700" :class="!item.readAt ? 'bg-blue-50/60 dark:bg-blue-950/20' : ''" type="button" @click="markRead(item)">
          <span class="flex items-start justify-between gap-3"><strong class="text-sm">{{ item.title }}</strong><time class="shrink-0 text-xs text-slate-500">{{ new Date(item.createdAt).toLocaleString('ru-RU') }}</time></span>
          <span class="mt-1 block text-sm text-slate-600 dark:text-slate-300">{{ item.message }}</span>
        </button>
      </div>
    </div>
  </section>
</template>
