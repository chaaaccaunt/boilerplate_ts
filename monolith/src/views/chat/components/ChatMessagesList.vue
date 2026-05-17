<script lang="ts" setup>
import { ref } from "vue"
import { DownloadIcon, EyeIcon, FileTextIcon } from "@lucide/vue"
import { MediaViewerModal } from "@/features/media-viewer"
import type { MediaViewerFile } from "@/features/media-viewer"

const props = defineProps<{
  messages: iSharedChat.ChatMessageDto[]
  activeRoomUid: string | null
  errorMessage: string
  resolveFileUrl: (path: string) => string
}>()

const viewedFile = ref<MediaViewerFile | null>(null)

function openFile(file: iSharedChat.ChatFileDto): void {
  if (!file.viewUrl) return

  viewedFile.value = {
    originalName: file.originalName,
    mimeType: file.mimeType,
    viewUrl: props.resolveFileUrl(file.viewUrl),
    downloadUrl: props.resolveFileUrl(file.url)
  }
}
</script>

<template>
  <div class="min-w-0 overflow-auto p-4">
    <div v-if="errorMessage" class="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
      {{ errorMessage }}
    </div>

    <div v-for="message in messages" :key="message.uid" class="mb-2 rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div class="mb-1 text-xs font-medium text-slate-500 dark:text-slate-400">
        {{ message.sender.lastName }} {{ message.sender.firstName }}
      </div>
      <div v-if="message.text" class="text-sm text-slate-950 dark:text-slate-50">{{ message.text }}</div>
      <div v-if="message.files.length" class="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        <div
          v-for="file in message.files"
          :key="file.uid"
          class="flex min-h-14 min-w-0 items-center gap-3 rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-50 dark:border-slate-700 dark:text-blue-300 dark:hover:bg-blue-950/40"
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
            class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-blue-700 transition hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-blue-300 dark:hover:bg-blue-950"
            type="button"
            :aria-label="`Просмотреть файл ${file.originalName}`"
            @click="openFile(file)"
          >
            <EyeIcon class="h-4 w-4" aria-hidden="true" />
          </button>
          <a
            class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-blue-700 transition hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-blue-300 dark:hover:bg-blue-950"
            :href="resolveFileUrl(file.url)"
            :aria-label="`Скачать файл ${file.originalName}`"
          >
            <DownloadIcon class="h-4 w-4" aria-hidden="true" />
          </a>
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
