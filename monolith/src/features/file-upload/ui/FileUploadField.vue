<script lang="ts" setup>
import { computed, ref } from "vue"
import { AlertCircleIcon, CheckCircle2Icon, FileTextIcon, PaperclipIcon, UploadIcon, XIcon } from "@lucide/vue"
import ModalHost from "@/application/providers/ModalHost.vue"
import { useApiClient } from "@/application/api"
import { ApiError } from "@/shared/api"
import type { FileUploadItem } from "../model/types"

const props = withDefaults(defineProps<{
  disabled?: boolean
  compact?: boolean
}>(), {
  disabled: false,
  compact: false
})

const emit = defineEmits<{
  (event: "update:files", files: iSharedFiles.UploadedFileDto[]): void
  (event: "uploading-change", value: boolean): void
}>()

const apiClient = useApiClient()
const uploadItems = ref<FileUploadItem[]>([])
const isModalOpen = ref(false)

const isUploading = computed(() => uploadItems.value.some((item) => item.status === "uploading"))
const uploadedFiles = computed(() => uploadItems.value
  .map((item) => item.uploadedFile)
  .filter((file): file is iSharedFiles.UploadedFileDto => Boolean(file)))
const completedItemsCount = computed(() => uploadItems.value.filter((item) => item.status !== "uploading").length)
const failedItemsCount = computed(() => uploadItems.value.filter((item) => item.status === "failed").length)
const overallProgress = computed(() => {
  if (!uploadItems.value.length) return 0

  const totalProgress = uploadItems.value.reduce((total, item) => total + getOverallItemProgress(item), 0)

  return Math.round(totalProgress / uploadItems.value.length)
})

function selectFiles(event: Event): void {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files || [])
  input.value = ""

  if (!files.length) return

  const nextItems = files.map((file) => createUploadItem(file))
  uploadItems.value = uploadItems.value.concat(nextItems.map(({ item }) => item))
  isModalOpen.value = true
  syncUploads()

  nextItems.forEach(({ file, item }) => {
    uploadFile(file, item.uid)
  })
}

function uploadFile(file: File, itemUid: string): void {
  apiClient.files.upload([file], "", (progress) => updateUploadProgress(itemUid, progress))
    .then((result) => {
      const uploadedFile = result.files[0]

      if (!uploadedFile) {
        throw new ApiError("FILE_UPLOAD_EMPTY_RESPONSE", "Сервер не вернул данные загруженного файла", 0)
      }

      updateUploadItem(itemUid, {
        progress: 100,
        status: "uploaded",
        uploadedFile,
        errorMessage: ""
      })
    })
    .catch((error) => {
      updateUploadItem(itemUid, {
        status: "failed",
        errorMessage: error instanceof ApiError ? error.message : "Не удалось загрузить файл"
      })
    })
    .finally(syncUploads)
}

function removeUploadItem(itemUid: string): void {
  uploadItems.value = uploadItems.value.filter((item) => item.uid !== itemUid)
  syncUploads()
}

function clear(): void {
  uploadItems.value = []
  isModalOpen.value = false
  syncUploads()
}

function closeModal(): void {
  if (isUploading.value) return
  isModalOpen.value = false
}

function updateUploadProgress(itemUid: string, progress: number): void {
  updateUploadItem(itemUid, { progress })
}

function updateUploadItem(itemUid: string, patch: Partial<FileUploadItem>): void {
  uploadItems.value = uploadItems.value.map((item) => item.uid === itemUid
    ? { ...item, ...patch }
    : item)
}

function syncUploads(): void {
  emit("update:files", uploadedFiles.value)
  emit("uploading-change", isUploading.value)
}

function createUploadItem(file: File): { file: File, item: FileUploadItem } {
  return {
    file,
    item: {
      uid: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      fileName: file.name,
      fileSize: file.size,
      progress: 0,
      status: "uploading",
      uploadedFile: null,
      errorMessage: ""
    }
  }
}

function getOverallItemProgress(item: FileUploadItem): number {
  if (item.status !== "uploading") return 100
  return item.progress
}

function formatFileSize(size: number): string {
  if (size < 1024) return `${size} Б`
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} КБ`
  return `${(size / 1024 / 1024).toFixed(1)} МБ`
}

function resolvePreviewUrl(file: iSharedFiles.UploadedFileDto): string | undefined {
  if (!file.previewUrl) return undefined

  return apiClient.resolvePublicUrl(file.previewUrl as `/${string}`)
}

defineExpose({ clear })
</script>

<template>
  <div :class="compact ? 'contents' : 'grid gap-2'">
    <div
      v-if="uploadItems.length"
      :class="compact ? 'col-span-3 flex min-w-0 flex-wrap gap-2' : 'flex min-w-0 flex-wrap gap-2'"
    >
      <div
        v-for="item in uploadItems"
        :key="item.uid"
        class="inline-flex max-w-full items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 dark:border-slate-700 dark:bg-slate-800"
      >
        <img
          v-if="item.uploadedFile?.previewUrl"
          class="h-8 w-8 shrink-0 rounded object-cover"
          :src="resolvePreviewUrl(item.uploadedFile)"
          :alt="`Превью файла ${item.fileName}`"
        >
        <FileTextIcon v-else class="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" aria-hidden="true" />
        <div class="min-w-0">
          <div class="max-w-52 truncate text-xs font-medium text-slate-700 dark:text-slate-200">{{ item.fileName }}</div>
          <div class="text-xs" :class="item.status === 'failed' ? 'text-red-600 dark:text-red-300' : 'text-slate-500 dark:text-slate-400'">
            <span v-if="item.status === 'uploading'">Загрузка {{ item.progress }}%</span>
            <span v-else-if="item.status === 'uploaded'">Загружен</span>
            <span v-else>Ошибка</span>
          </div>
        </div>
        <button
          class="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-500 transition hover:bg-white hover:text-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-50"
          type="button"
          :disabled="item.status === 'uploading'"
          :aria-label="`Убрать файл ${item.fileName}`"
          @click="removeUploadItem(item.uid)"
        >
          <XIcon class="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>

    <label
      class="inline-flex min-h-10 items-center justify-center rounded-md border border-slate-300 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
      :class="[
        compact ? 'w-10 px-0' : 'gap-2 px-3',
        disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
      ]"
      :aria-label="compact ? 'Прикрепить файлы' : undefined"
    >
      <PaperclipIcon v-if="compact" class="h-4 w-4" aria-hidden="true" />
      <UploadIcon v-else class="h-4 w-4" aria-hidden="true" />
      <span v-if="!compact">Файлы</span>
      <input class="sr-only" type="file" multiple :disabled="disabled" @change="selectFiles">
    </label>

    <ModalHost
      :model-value="isModalOpen"
      labelled-by="file-upload-modal-title"
      :close-on-backdrop="!isUploading"
      :close-on-escape="!isUploading"
      @update:model-value="$event ? isModalOpen = true : closeModal()"
    >
      <template #default>
        <header class="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-700">
          <div class="min-w-0">
            <h2 id="file-upload-modal-title" class="min-w-0 truncate text-base font-semibold text-slate-950 dark:text-slate-50">
              Загрузка файлов
            </h2>
            <div class="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {{ completedItemsCount }} из {{ uploadItems.length }} обработано
            </div>
          </div>
          <button
            class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-50"
            type="button"
            :disabled="isUploading"
            aria-label="Закрыть окно"
            @click="closeModal"
          >
            <XIcon class="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        <div class="grid gap-4 px-5 py-4">
          <div class="grid gap-2">
            <div class="flex items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
              <span>Общий прогресс</span>
              <span>{{ overallProgress }}%</span>
            </div>
            <div class="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
              <div
                class="h-full rounded-full bg-blue-600 transition-all"
                :style="{ width: `${overallProgress}%` }"
              ></div>
            </div>
          </div>

          <div class="max-h-96 overflow-y-auto pr-1">
            <div class="grid gap-2">
              <div
                v-for="item in uploadItems"
                :key="item.uid"
                class="rounded-md border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800"
              >
                <div class="mb-2 flex min-w-0 items-start gap-2">
                  <img
                    v-if="item.uploadedFile?.previewUrl"
                    class="h-10 w-10 shrink-0 rounded object-cover"
                    :src="resolvePreviewUrl(item.uploadedFile)"
                    :alt="`Превью файла ${item.fileName}`"
                  >
                  <FileTextIcon v-else class="mt-0.5 h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" aria-hidden="true" />
                  <div class="min-w-0 flex-1">
                    <div class="truncate text-xs font-medium text-slate-700 dark:text-slate-200">{{ item.fileName }}</div>
                    <div class="text-xs text-slate-500 dark:text-slate-400">{{ formatFileSize(item.fileSize) }}</div>
                  </div>
                  <CheckCircle2Icon v-if="item.status === 'uploaded'" class="h-4 w-4 shrink-0 text-green-600 dark:text-green-400" aria-hidden="true" />
                  <AlertCircleIcon v-else-if="item.status === 'failed'" class="h-4 w-4 shrink-0 text-red-600 dark:text-red-300" aria-hidden="true" />
                </div>

                <div class="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                  <div
                    class="h-full rounded-full transition-all"
                    :class="item.status === 'failed' ? 'bg-red-500' : item.status === 'uploaded' ? 'bg-green-600' : 'bg-blue-600'"
                    :style="{ width: `${item.status === 'failed' ? 100 : item.progress}%` }"
                  ></div>
                </div>

                <div class="mt-1 text-xs" :class="item.status === 'failed' ? 'text-red-600 dark:text-red-300' : 'text-slate-500 dark:text-slate-400'">
                  <span v-if="item.status === 'uploading'">Загрузка {{ item.progress }}%</span>
                  <span v-else-if="item.status === 'uploaded'">Загружен</span>
                  <span v-else>{{ item.errorMessage }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <footer class="flex items-center justify-between gap-3 border-t border-slate-200 px-5 py-4 dark:border-slate-700">
          <div class="min-w-0 text-xs text-slate-500 dark:text-slate-400">
            <span v-if="isUploading">Не закрывайте окно до завершения загрузки.</span>
            <span v-else-if="failedItemsCount">Ошибок: {{ failedItemsCount }}</span>
            <span v-else>Все файлы загружены.</span>
          </div>
          <button
            class="inline-flex min-h-10 items-center justify-center rounded-md bg-blue-600 px-4 text-sm font-medium text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
            type="button"
            :disabled="isUploading"
            @click="closeModal"
          >
            Готово
          </button>
        </footer>
      </template>
    </ModalHost>
  </div>
</template>
