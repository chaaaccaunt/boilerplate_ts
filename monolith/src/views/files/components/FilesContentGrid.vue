<script lang="ts" setup>
import { DownloadIcon, FileTextIcon, LinkIcon, PencilIcon, Trash2Icon } from "@lucide/vue"
import FilesBulkToolbar from "./FilesBulkToolbar.vue"

const props = defineProps<{
  folders: iSharedFiles.FileFolderDto[]
  files: iSharedFiles.UploadedFileDto[]
  documents: iSharedFiles.StoredDocumentListItemDto[]
  currentFolder: iSharedFiles.FileFolderDto | null
  selectedTileKeys: string[]
  canManageCurrentItems: boolean
  areAllItemsSelected: boolean
  selectedItemsCount: number
  selectedFilesCount: number
  selectedDocumentsCount: number
  isBulkDownloading: boolean
  bulkDownloadButtonText: string
  canManage: (entity: { createdByUserUid: string }) => boolean
  resolveFileUrl: (path: string) => string
  hasPreview: (file: iSharedFiles.UploadedFileDto) => boolean
}>()

const emit = defineEmits<{
  (event: "toggle-all"): void
  (event: "download-selected"): void
  (event: "set-visibility", visibility: iSharedFiles.FileVisibility): void
  (event: "delete-selected"): void
  (event: "toggle-selection", selectionKey: string): void
  (event: "open-folder", folderUid: string): void
  (event: "rename-folder", folder: iSharedFiles.FileFolderDto): void
  (event: "delete-folder", folder: iSharedFiles.FileFolderDto): void
  (event: "open-file", file: iSharedFiles.UploadedFileDto): void
  (event: "copy-file-link", file: iSharedFiles.UploadedFileDto): void
  (event: "rename-file", file: iSharedFiles.UploadedFileDto): void
  (event: "delete-file", file: iSharedFiles.UploadedFileDto): void
  (event: "open-document", document: iSharedFiles.StoredDocumentListItemDto): void
  (event: "download-document", document: iSharedFiles.StoredDocumentListItemDto): void
  (event: "rename-document", document: iSharedFiles.StoredDocumentListItemDto): void
  (event: "delete-document", document: iSharedFiles.StoredDocumentListItemDto): void
  (event: "preview-error", fileUid: string): void
}>()

function getFolderSelectionKey(folderUid: string): string {
  return `folder:${folderUid}`
}

function getFileSelectionKey(fileUid: string): string {
  return `file:${fileUid}`
}

function getDocumentSelectionKey(documentUid: string): string {
  return `document:${documentUid}`
}

function isTileSelected(selectionKey: string): boolean {
  return props.selectedTileKeys.includes(selectionKey)
}

function formatVisibility(value: iSharedFiles.FileVisibility): string {
  return value === "private" ? "Скрыт" : "Доступен"
}

function formatDocumentStatus(value: iSharedFiles.StoredDocumentStatus): string {
  return value === "final" ? "Завершен" : "Черновик"
}
</script>

<template>
  <div class="min-h-[360px]">
    <div v-if="!folders.length && !files.length && !documents.length" class="rounded-md border border-slate-200 bg-white px-4 py-8 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
      В этой папке пока нет файлов и документов.
    </div>

    <div v-else class="grid gap-4">
      <div
        v-if="currentFolder"
        class="rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
      >
        {{ formatVisibility(currentFolder.visibility) }}
      </div>

      <FilesBulkToolbar
        v-if="canManageCurrentItems"
        :are-all-items-selected="areAllItemsSelected"
        :selected-items-count="selectedItemsCount"
        :selected-files-count="selectedFilesCount"
        :selected-documents-count="selectedDocumentsCount"
        :is-bulk-downloading="isBulkDownloading"
        :bulk-download-button-text="bulkDownloadButtonText"
        @toggle-all="emit('toggle-all')"
        @download-selected="emit('download-selected')"
        @set-visibility="emit('set-visibility', $event)"
        @delete-selected="emit('delete-selected')"
      />

      <div class="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-x-6 gap-y-7">
        <div
          v-for="folder in folders"
          :key="folder.uid"
          class="group relative flex min-h-40 w-32 flex-col items-center justify-start gap-2 rounded-md border border-transparent px-2 py-2 text-center transition hover:bg-blue-50 focus-within:ring-2 focus-within:ring-blue-500 dark:hover:bg-blue-950/40"
          :class="isTileSelected(getFolderSelectionKey(folder.uid)) ? 'border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-950/70' : ''"
        >
          <input
            v-if="canManage(folder)"
            class="absolute left-2 top-2 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-950"
            type="checkbox"
            :aria-label="`Выбрать папку ${folder.title}`"
            :checked="isTileSelected(getFolderSelectionKey(folder.uid))"
            @click.stop
            @change="emit('toggle-selection', getFolderSelectionKey(folder.uid))"
          >
          <button class="flex w-full flex-col items-center gap-2 focus:outline-none" type="button" @click="emit('open-folder', folder.uid)">
            <span class="relative h-16 w-24 shrink-0">
              <span class="absolute left-1 top-0 h-5 w-11 rounded-t-md bg-amber-400 shadow-sm dark:bg-amber-500"></span>
              <span class="absolute inset-x-0 bottom-0 h-14 rounded-md bg-amber-300 shadow-[inset_0_-10px_16px_rgba(217,119,6,0.18),0_1px_2px_rgba(15,23,42,0.2)] ring-1 ring-amber-400/80 dark:bg-amber-400 dark:ring-amber-300/80"></span>
            </span>
            <span class="line-clamp-2 w-full text-xs font-medium leading-4 text-slate-800 group-hover:text-blue-700 dark:text-slate-100 dark:group-hover:text-blue-100">
              {{ folder.title }}
            </span>
          </button>

          <div v-if="canManage(folder)" class="flex max-w-28 flex-wrap items-center justify-center gap-1">
            <button
              class="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-500 transition hover:bg-white hover:text-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-50"
              type="button"
              aria-label="Переименовать папку"
              @click="emit('rename-folder', folder)"
            >
              <PencilIcon class="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              class="inline-flex h-7 w-7 items-center justify-center rounded-md text-red-500 transition hover:bg-red-50 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 dark:text-red-300 dark:hover:bg-red-950/40"
              type="button"
              aria-label="Удалить папку"
              @click="emit('delete-folder', folder)"
            >
              <Trash2Icon class="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div
          v-for="document in documents"
          :key="document.documentUid"
          class="group relative flex min-h-40 w-32 flex-col items-center justify-start gap-2 rounded-md border border-transparent px-2 py-2 text-center transition hover:bg-blue-50 focus-within:ring-2 focus-within:ring-blue-500 dark:hover:bg-blue-950/40"
          :class="isTileSelected(getDocumentSelectionKey(document.documentUid)) ? 'border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-950/70' : ''"
        >
          <input
            v-if="canManage(document)"
            class="absolute left-2 top-2 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-950"
            type="checkbox"
            :aria-label="`Выбрать документ ${document.title}`"
            :checked="isTileSelected(getDocumentSelectionKey(document.documentUid))"
            @click.stop
            @change="emit('toggle-selection', getDocumentSelectionKey(document.documentUid))"
          >
          <button class="flex w-full flex-col items-center gap-2 focus:outline-none" type="button" @click="emit('open-document', document)">
            <span class="relative flex h-16 w-24 shrink-0 items-center justify-center rounded-md border border-blue-100 bg-white shadow-sm ring-1 ring-slate-200 dark:border-blue-900/60 dark:bg-slate-900 dark:ring-slate-700">
              <FileTextIcon class="h-9 w-9 text-blue-600 dark:text-blue-300" aria-hidden="true" />
              <span class="absolute bottom-1 rounded bg-blue-600 px-1.5 py-0.5 text-[10px] font-semibold uppercase leading-none text-white dark:bg-blue-500">
                doc
              </span>
            </span>
            <span class="line-clamp-2 w-full text-xs font-medium leading-4 text-slate-800 group-hover:text-blue-700 dark:text-slate-100 dark:group-hover:text-blue-100">
              {{ document.title }}
            </span>
            <span class="text-[11px] leading-3 text-slate-500 dark:text-slate-400">{{ formatDocumentStatus(document.status) }}</span>
          </button>

          <div class="flex max-w-28 flex-wrap items-center justify-center gap-1">
            <button
              class="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-500 transition hover:bg-white hover:text-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-50"
              type="button"
              aria-label="Скачать документ"
              @click="emit('download-document', document)"
            >
              <DownloadIcon class="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              v-if="canManage(document) && document.status === 'draft'"
              class="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-500 transition hover:bg-white hover:text-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-50"
              type="button"
              aria-label="Переименовать документ"
              @click="emit('rename-document', document)"
            >
              <PencilIcon class="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              v-if="canManage(document)"
              class="inline-flex h-7 w-7 items-center justify-center rounded-md text-red-500 transition hover:bg-red-50 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 dark:text-red-300 dark:hover:bg-red-950/40"
              type="button"
              aria-label="Удалить документ"
              @click="emit('delete-document', document)"
            >
              <Trash2Icon class="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div
          v-for="file in files"
          :key="file.fileUid"
          class="group relative flex min-h-40 w-32 flex-col items-center justify-start gap-2 rounded-md border border-transparent px-2 py-2 text-center transition hover:bg-blue-50 focus-within:ring-2 focus-within:ring-blue-500 dark:hover:bg-blue-950/40"
          :class="isTileSelected(getFileSelectionKey(file.fileUid)) ? 'border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-950/70' : ''"
        >
          <input
            v-if="canManage(file)"
            class="absolute left-2 top-2 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-950"
            type="checkbox"
            :aria-label="`Выбрать файл ${file.originalName}`"
            :checked="isTileSelected(getFileSelectionKey(file.fileUid))"
            @click.stop
            @change="emit('toggle-selection', getFileSelectionKey(file.fileUid))"
          >
          <button
            class="flex w-full flex-col items-center gap-2 focus:outline-none disabled:cursor-default"
            type="button"
            :disabled="!file.viewUrl"
            @click="emit('open-file', file)"
          >
            <img
              v-if="hasPreview(file)"
              class="h-16 w-24 shrink-0 rounded-md object-cover shadow-sm ring-1 ring-slate-200 dark:ring-slate-700"
              :src="resolveFileUrl(file.previewUrl as string)"
              :alt="`Превью файла ${file.originalName}`"
              @error="emit('preview-error', file.fileUid)"
            >
            <span v-else class="flex h-16 w-24 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <FileTextIcon class="h-8 w-8 text-slate-500 dark:text-slate-400" aria-hidden="true" />
            </span>
            <span class="line-clamp-2 w-full text-xs font-medium leading-4 text-slate-800 group-hover:text-blue-700 dark:text-slate-100 dark:group-hover:text-blue-100">
              {{ file.originalName }}
            </span>
          </button>

          <div class="flex max-w-28 flex-wrap items-center justify-center gap-1">
            <button
              class="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-500 transition hover:bg-white hover:text-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-50"
              type="button"
              aria-label="Скопировать ссылку"
              @click="emit('copy-file-link', file)"
            >
              <LinkIcon class="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              v-if="canManage(file)"
              class="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-500 transition hover:bg-white hover:text-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-50"
              type="button"
              aria-label="Изменить описание файла"
              @click="emit('rename-file', file)"
            >
              <PencilIcon class="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              v-if="canManage(file)"
              class="inline-flex h-7 w-7 items-center justify-center rounded-md text-red-500 transition hover:bg-red-50 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 dark:text-red-300 dark:hover:bg-red-950/40"
              type="button"
              aria-label="Удалить файл"
              @click="emit('delete-file', file)"
            >
              <Trash2Icon class="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
