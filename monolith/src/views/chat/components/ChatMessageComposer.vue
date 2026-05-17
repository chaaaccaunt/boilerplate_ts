<script lang="ts" setup>
import { computed, ref } from "vue"
import { SendIcon } from "@lucide/vue"
import { FileUploadField } from "@/features/file-upload"

const props = defineProps<{
  activeRoomUid: string | null
  isSending: boolean
}>()

const emit = defineEmits<{
  (event: "send", payload: { text: string, files: iSharedFiles.UploadedFileDto[] }): void
}>()

const newMessageText = ref("")
const uploadedFiles = ref<iSharedFiles.UploadedFileDto[]>([])
const isUploadingFiles = ref(false)
const fileUploadField = ref<InstanceType<typeof FileUploadField> | null>(null)
const canSendMessage = computed(() => Boolean(
  props.activeRoomUid &&
  (newMessageText.value.trim() || uploadedFiles.value.length) &&
  !props.isSending &&
  !isUploadingFiles.value
))

function sendMessage(): void {
  if (!canSendMessage.value) return

  emit("send", {
    text: newMessageText.value.trim(),
    files: uploadedFiles.value
  })
  newMessageText.value = ""
  uploadedFiles.value = []
  fileUploadField.value?.clear()
}
</script>

<template>
  <form class="grid gap-3 border-t border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900" @submit.prevent="sendMessage">
    <div class="grid grid-cols-[auto_minmax(0,1fr)_auto] gap-3">
      <FileUploadField
        ref="fileUploadField"
        :disabled="!activeRoomUid || isSending"
        compact
        @update:files="uploadedFiles = $event"
        @uploading-change="isUploadingFiles = $event"
      />
      <input
        v-model="newMessageText"
        class="h-10 min-w-0 rounded-md border border-slate-300 px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50 dark:focus:ring-blue-950 dark:disabled:bg-slate-800 dark:disabled:text-slate-500"
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
        {{ isSending ? "Отправка..." : isUploadingFiles ? "Загрузка..." : "Отправить" }}
      </button>
    </div>
  </form>
</template>
