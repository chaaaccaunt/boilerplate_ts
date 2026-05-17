<script lang="ts" setup>
import { ref } from "vue"
import { DownloadIcon, EyeIcon, FileTextIcon, PencilIcon, SaveIcon, Trash2Icon, XIcon } from "@lucide/vue"
import { MediaViewerModal } from "@/features/media-viewer"
import type { MediaViewerFile } from "@/features/media-viewer"

const props = defineProps<{
  messages: iSharedChat.ChatMessageDto[]
  activeRoomUid: string | null
  errorMessage: string
  resolveFileUrl: (path: string) => string
}>()

const emit = defineEmits<{
  (event: "update-message", payload: iSharedChat.ChatMessageUpdatePayloadDto): void
  (event: "delete-message", payload: iSharedChat.ChatMessageDeletePayloadDto): void
  (event: "delete-message-file", payload: iSharedChat.ChatMessageFileDeletePayloadDto): void
}>()

const viewedFile = ref<MediaViewerFile | null>(null)
const editedMessageUid = ref<string | null>(null)
const editedText = ref("")

function openFile(file: iSharedChat.ChatFileDto): void {
  if (!file.viewUrl) return

  viewedFile.value = {
    originalName: file.originalName,
    mimeType: file.mimeType,
    viewUrl: props.resolveFileUrl(file.viewUrl),
    downloadUrl: props.resolveFileUrl(file.url)
  }
}

function startEdit(message: iSharedChat.ChatMessageDto): void {
  editedMessageUid.value = message.uid
  editedText.value = message.text || ""
}

function cancelEdit(): void {
  editedMessageUid.value = null
  editedText.value = ""
}

function saveMessage(message: iSharedChat.ChatMessageDto): void {
  const text = editedText.value.trim()

  emit("update-message", {
    messageUid: message.uid,
    text: text || undefined,
    files: message.files.map((file) => ({ fileUid: file.fileUid }))
  })
  cancelEdit()
}

function deleteMessage(message: iSharedChat.ChatMessageDto): void {
  emit("delete-message", { messageUid: message.uid })
}

function deleteMessageFile(message: iSharedChat.ChatMessageDto, file: iSharedChat.ChatFileDto): void {
  emit("delete-message-file", {
    messageUid: message.uid,
    fileUid: file.fileUid
  })
}
</script>

<template>
  <div class="min-w-0 overflow-auto p-4">
    <div v-if="errorMessage" class="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
      {{ errorMessage }}
    </div>

    <div
      v-for="message in messages"
      :key="message.uid"
      class="mb-3 flex"
      :class="message.isOwn ? 'justify-end' : 'justify-start'"
    >
      <div
        class="max-w-[min(760px,88%)] rounded-lg border p-4 shadow-sm"
        :class="message.isOwn ? 'border-blue-500 bg-blue-600 text-white dark:border-blue-500 dark:bg-blue-600' : 'border-slate-200 bg-white text-slate-950 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50'"
      >
        <div
          class="mb-1 text-xs font-medium"
          :class="message.isOwn ? 'text-blue-100' : 'text-slate-500 dark:text-slate-400'"
        >
          {{ message.sender.lastName }} {{ message.sender.firstName }}
        </div>
        <div v-if="message.isOwn" class="mb-2 flex justify-end gap-1">
          <button
            v-if="editedMessageUid !== message.uid"
            class="inline-flex h-8 w-8 items-center justify-center rounded-md transition"
            :class="message.isOwn ? 'text-white hover:bg-blue-400/50' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'"
            type="button"
            :aria-label="`Редактировать сообщение ${message.uid}`"
            @click="startEdit(message)"
          >
            <PencilIcon class="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            v-if="editedMessageUid === message.uid"
            class="inline-flex h-8 w-8 items-center justify-center rounded-md text-white transition hover:bg-blue-400/50"
            type="button"
            :aria-label="`Сохранить сообщение ${message.uid}`"
            @click="saveMessage(message)"
          >
            <SaveIcon class="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            v-if="editedMessageUid === message.uid"
            class="inline-flex h-8 w-8 items-center justify-center rounded-md text-white transition hover:bg-blue-400/50"
            type="button"
            :aria-label="`Отменить редактирование сообщения ${message.uid}`"
            @click="cancelEdit"
          >
            <XIcon class="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            class="inline-flex h-8 w-8 items-center justify-center rounded-md text-white transition hover:bg-blue-400/50"
            type="button"
            :aria-label="`Удалить сообщение ${message.uid}`"
            @click="deleteMessage(message)"
          >
            <Trash2Icon class="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <textarea
          v-if="editedMessageUid === message.uid"
          v-model="editedText"
          class="min-h-24 w-full rounded-md border border-blue-300 px-3 py-2 text-sm text-slate-950 outline-none transition focus:ring-2 focus:ring-blue-100"
        ></textarea>
        <div v-else-if="message.text" class="whitespace-pre-wrap text-sm">{{ message.text }}</div>
        <div v-if="message.files.length" class="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          <div
            v-for="file in message.files"
            :key="file.uid"
            class="flex min-h-14 min-w-0 items-center gap-3 rounded-md border px-3 py-2 text-sm font-medium transition"
            :class="message.isOwn ? 'border-blue-400 bg-blue-500/40 text-white hover:bg-blue-500/60' : 'border-slate-200 text-blue-700 hover:bg-blue-50 dark:border-slate-700 dark:text-blue-300 dark:hover:bg-blue-950/40'"
          >
            <button
              class="flex min-w-0 flex-1 items-center gap-3 text-left"
              type="button"
              :disabled="!file.viewUrl"
              :aria-label="file.viewUrl ? `Открыть файл ${file.originalName}` : undefined"
              @click="openFile(file)"
            >
              <img
                v-if="file.previewUrl"
                class="h-11 w-11 shrink-0 rounded object-cover"
                :src="resolveFileUrl(file.previewUrl)"
                :alt="`Превью файла ${file.originalName}`"
              >
              <span v-else class="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                <FileTextIcon class="h-5 w-5" aria-hidden="true" />
              </span>
              <span class="min-w-0 truncate">{{ file.originalName }}</span>
            </button>
            <button
              v-if="file.viewUrl"
              class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md transition hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:hover:bg-blue-950"
              :class="message.isOwn ? 'text-white hover:bg-blue-400/50' : 'text-blue-700 dark:text-blue-300'"
              type="button"
              :aria-label="`Просмотреть файл ${file.originalName}`"
              @click="openFile(file)"
            >
              <EyeIcon class="h-4 w-4" aria-hidden="true" />
            </button>
            <a
              class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md transition hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:hover:bg-blue-950"
              :class="message.isOwn ? 'text-white hover:bg-blue-400/50' : 'text-blue-700 dark:text-blue-300'"
              :href="resolveFileUrl(file.url)"
              :aria-label="`Скачать файл ${file.originalName}`"
            >
              <DownloadIcon class="h-4 w-4" aria-hidden="true" />
            </a>
            <button
              v-if="message.isOwn"
              class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md transition hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500"
              :class="message.isOwn ? 'text-white hover:bg-blue-400/50' : 'text-red-600 dark:hover:bg-red-950/40'"
              type="button"
              :aria-label="`Удалить вложение ${file.originalName}`"
              @click="deleteMessageFile(message, file)"
            >
              <Trash2Icon class="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="activeRoomUid && !messages.length" class="text-sm text-slate-500 dark:text-slate-400">
      Сообщений пока нет
    </div>

    <MediaViewerModal
      :model-value="Boolean(viewedFile)"
      :file="viewedFile"
      @update:model-value="viewedFile = $event ? viewedFile : null"
    />
  </div>
</template>
