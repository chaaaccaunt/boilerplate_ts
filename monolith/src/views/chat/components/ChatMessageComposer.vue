<script lang="ts" setup>
import { computed, ref } from "vue"
import { SendIcon } from "@lucide/vue"

const props = defineProps<{
  activeRoomUid: string | null
  isSending: boolean
}>()

const emit = defineEmits<{
  (event: "send", text: string): void
}>()

const newMessageText = ref("")
const canSendMessage = computed(() => Boolean(props.activeRoomUid && newMessageText.value.trim() && !props.isSending))

function sendMessage(): void {
  if (!canSendMessage.value) return

  emit("send", newMessageText.value.trim())
  newMessageText.value = ""
}
</script>

<template>
  <form class="grid grid-cols-[minmax(0,1fr)_auto] gap-3 border-t border-slate-200 bg-white p-4" @submit.prevent="sendMessage">
    <input
      v-model="newMessageText"
      class="h-10 min-w-0 rounded-md border border-slate-300 px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
      type="text"
      placeholder="Сообщение"
      :disabled="!activeRoomUid"
    >
    <button
      class="inline-flex min-h-10 items-center gap-2 rounded-md bg-blue-600 px-4 text-sm font-medium text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
      type="submit"
      :disabled="!canSendMessage"
    >
      <SendIcon class="h-4 w-4" aria-hidden="true" />
      {{ isSending ? "Отправка..." : "Отправить" }}
    </button>
  </form>
</template>
