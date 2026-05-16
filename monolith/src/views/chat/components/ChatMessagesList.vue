<script lang="ts" setup>
defineProps<{
  messages: iSharedChat.ChatMessageDto[]
  activeRoomUid: string | null
  errorMessage: string
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
      <div class="text-sm text-slate-950">{{ message.text }}</div>
    </div>

    <div v-if="activeRoomUid && !messages.length" class="text-sm text-slate-500">
      Сообщений пока нет
    </div>
  </div>
</template>
