<script lang="ts" setup>
import { computed, onMounted, ref } from "vue"
import { DownloadIcon, SaveIcon, Trash2Icon } from "@lucide/vue"
import { useApiClient } from "@/application/api"
import { useStore } from "@/application/store"
import { FileUploadField } from "@/features/file-upload"
import { ApiError } from "@/shared/api"

const apiClient = useApiClient()
const store = useStore()

const isLoading = ref(false)
const errorMessage = ref("")
const editedFileUid = ref<string | null>(null)
const editedDescription = ref("")

const files = computed(() => store.state.files.files)

onMounted(() => {
  loadFiles()
})

function loadFiles(): void {
  isLoading.value = true
  errorMessage.value = ""

  apiClient.files.list()
    .catch((error) => {
      errorMessage.value = error instanceof ApiError ? error.message : "Не удалось загрузить файлы"
    })
    .finally(() => {
      isLoading.value = false
    })
}

function startEdit(file: iSharedFiles.UploadedFileDto): void {
  editedFileUid.value = file.fileUid
  editedDescription.value = file.description || ""
}

function saveFile(file: iSharedFiles.UploadedFileDto): void {
  apiClient.files.update({
    fileUid: file.fileUid,
    description: editedDescription.value.trim() || undefined
  })
    .then(() => {
      editedFileUid.value = null
      editedDescription.value = ""
    })
    .catch((error) => {
      errorMessage.value = error instanceof ApiError ? error.message : "Не удалось обновить файл"
    })
}

function deleteFile(file: iSharedFiles.UploadedFileDto): void {
  apiClient.files.delete({ fileUid: file.fileUid })
    .catch((error) => {
      errorMessage.value = error instanceof ApiError ? error.message : "Не удалось удалить файл"
    })
}

function resolveFileUrl(path: string): string {
  return apiClient.resolvePublicUrl(path as `/${string}`)
}
</script>

<template>
  <section class="p-4 lg:p-6">
    <div class="mb-5 flex items-center justify-between gap-3">
      <h1 class="text-2xl font-semibold text-slate-950 dark:text-slate-50">Файлы</h1>
      <button
        class="inline-flex min-h-9 items-center rounded-md border border-blue-200 px-3 text-sm font-medium text-blue-700 transition hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-blue-900 dark:text-blue-300 dark:hover:bg-blue-950/40"
        type="button"
        :disabled="isLoading"
        @click="loadFiles"
      >
        Обновить
      </button>
    </div>

    <div v-if="errorMessage" class="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
      {{ errorMessage }}
    </div>

    <div class="mb-5 rounded-md border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
      <FileUploadField @update:files="loadFiles" />
    </div>

    <div class="grid gap-3">
      <div
        v-for="file in files"
        :key="file.fileUid"
        class="grid gap-3 rounded-md border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900 md:grid-cols-[minmax(0,1fr)_minmax(220px,360px)_auto]"
      >
        <div class="min-w-0">
          <div class="truncate text-sm font-semibold text-slate-950 dark:text-slate-50">{{ file.originalName }}</div>
          <div class="mt-1 text-xs text-slate-500 dark:text-slate-400">{{ file.mimeType }} · {{ file.size }} байт</div>
        </div>

        <input
          v-if="editedFileUid === file.fileUid"
          v-model="editedDescription"
          class="h-10 min-w-0 rounded-md border border-slate-300 px-3 text-sm text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50 dark:focus:ring-blue-950"
          type="text"
        >
        <button
          v-else
          class="min-w-0 truncate text-left text-sm text-slate-600 dark:text-slate-300"
          type="button"
          @click="startEdit(file)"
        >
          {{ file.description || "Без описания" }}
        </button>

        <div class="flex justify-end gap-1">
          <button
            v-if="editedFileUid === file.fileUid"
            class="inline-flex h-9 w-9 items-center justify-center rounded-md text-blue-700 transition hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-blue-300 dark:hover:bg-blue-950"
            type="button"
            :aria-label="`Сохранить файл ${file.originalName}`"
            @click="saveFile(file)"
          >
            <SaveIcon class="h-4 w-4" aria-hidden="true" />
          </button>
          <a
            class="inline-flex h-9 w-9 items-center justify-center rounded-md text-blue-700 transition hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-blue-300 dark:hover:bg-blue-950"
            :href="resolveFileUrl(file.url)"
            :aria-label="`Скачать файл ${file.originalName}`"
          >
            <DownloadIcon class="h-4 w-4" aria-hidden="true" />
          </a>
          <button
            class="inline-flex h-9 w-9 items-center justify-center rounded-md text-red-600 transition hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 dark:hover:bg-red-950/40"
            type="button"
            :aria-label="`Удалить файл ${file.originalName}`"
            @click="deleteFile(file)"
          >
            <Trash2Icon class="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  </section>
</template>
