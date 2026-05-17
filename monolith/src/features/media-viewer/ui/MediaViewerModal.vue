<script lang="ts" setup>
import { computed } from "vue"
import { DownloadIcon, FileTextIcon, XIcon } from "@lucide/vue"
import type { MediaViewerFile } from "../model/types"

const props = defineProps<{
  modelValue: boolean
  file: MediaViewerFile | null
}>()

const emit = defineEmits<{
  (event: "update:modelValue", value: boolean): void
}>()

const isImage = computed(() => Boolean(props.file?.mimeType.startsWith("image/")))
const isVideo = computed(() => Boolean(props.file?.mimeType.startsWith("video/")))

function close(): void {
  emit("update:modelValue", false)
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="modelValue"
      class="fixed inset-0 z-50 grid grid-rows-[auto_minmax(0,1fr)] bg-slate-950"
      role="dialog"
      aria-modal="true"
      aria-labelledby="media-viewer-modal-title"
    >
      <header class="flex min-w-0 items-center justify-between gap-3 border-b border-white/10 bg-slate-950 px-5 py-4">
        <h2 id="media-viewer-modal-title" class="min-w-0 truncate text-base font-semibold text-slate-950 dark:text-slate-50">
          {{ file?.originalName || "Просмотр файла" }}
        </h2>
        <div class="flex shrink-0 items-center gap-2">
          <a
            v-if="file"
            class="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-50"
            :href="file.downloadUrl"
            :aria-label="`Скачать файл ${file.originalName}`"
          >
            <DownloadIcon class="h-5 w-5" aria-hidden="true" />
          </a>
          <button
            class="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-50"
            type="button"
            aria-label="Закрыть окно"
            @click="close"
          >
            <XIcon class="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </header>

      <div class="flex min-h-0 items-center justify-center overflow-auto bg-slate-950 p-4">
        <img
          v-if="file && isImage"
          class="max-h-full max-w-full object-contain"
          :src="file.viewUrl"
          :alt="file.originalName"
        >
        <video
          v-else-if="file && isVideo"
          class="max-h-full max-w-full bg-black"
          :src="file.viewUrl"
          controls
        ></video>
        <div v-else class="flex min-h-64 flex-col items-center justify-center gap-3 px-5 py-8 text-slate-300">
          <FileTextIcon class="h-10 w-10" aria-hidden="true" />
          <span class="text-sm">Просмотр файла недоступен</span>
        </div>
      </div>
    </div>
  </Teleport>
</template>
