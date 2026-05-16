<script lang="ts" setup>
defineProps<{
  messages: iSharedChat.ChatMessageDto[]
  activeRoomUid: string | null
  errorMessage: string
  resolveFileUrl: (path: string) => string
}>()
</script>

<template>
  <div class="min-w-0 overflow-auto p-4">
    <div v-if="errorMessage" class="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
      {{ errorMessage }}
    </div>

    <div v-for="message in messages" :key="message.uid" class="mb-2 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div class="mb-1 text-xs font-medium text-slate-500">
        {{ message.sender.lastName }} {{ message.sender.firstName }}
      </div>
      <div v-if="message.text" class="text-sm text-slate-950">{{ message.text }}</div>
      <div v-if="message.files.length" class="mt-3 grid gap-2">
        <a
          v-for="file in message.files"
          :key="file.uid"
          class="inline-flex min-h-9 items-center rounded-md border border-slate-200 px-3 text-sm font-medium text-blue-700 transition hover:bg-blue-50"
          :href="resolveFileUrl(file.url)"
          target="_blank"
          rel="noreferrer"
        >
          {{ file.originalName }}
        </a>
      </div>
    </div>

    <div v-if="activeRoomUid && !messages.length" class="text-sm text-slate-500">
      Сообщений пока нет
    </div>
  </div>
</template>
