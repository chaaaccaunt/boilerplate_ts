<script lang="ts" setup>
import { FileTextIcon, FolderPlusIcon } from "@lucide/vue"
import { FileUploadField } from "@/features/file-upload"

defineProps<{
  title: string
  isOwnersOverview: boolean
  isMyFiles: boolean
  currentFolderUid: string | null
  currentOwner: iSharedFiles.FileOwnerDto | null
  breadcrumbs: iSharedFiles.FileFolderDto[]
  canCreateInCurrentLocation: boolean
}>()

const emit = defineEmits<{
  (event: "open-owners-overview"): void
  (event: "open-root"): void
  (event: "open-folder", folderUid: string): void
  (event: "open-folder-modal"): void
  (event: "create-document"): void
  (event: "uploaded-files", files: iSharedFiles.UploadedFileDto[]): void
}>()
</script>

<template>
  <header class="border-b border-slate-200 bg-white px-4 py-4 dark:border-slate-700 dark:bg-slate-900">
    <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div class="min-w-0">
        <h1 class="text-xl font-semibold text-slate-950 dark:text-slate-50">{{ title }}</h1>
        <div class="mt-3 flex min-w-0 flex-wrap items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <button
            class="inline-flex h-8 max-w-56 items-center truncate rounded-md border border-slate-300 bg-white px-3 font-medium text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-blue-700 dark:hover:bg-blue-950/40 dark:hover:text-blue-200"
            :class="isOwnersOverview ? 'border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-950/70 dark:text-blue-100' : ''"
            type="button"
            @click="emit('open-owners-overview')"
          >
            Пользователи
          </button>
          <template v-if="!isOwnersOverview">
            <button
              class="inline-flex h-8 max-w-56 items-center truncate rounded-md border border-slate-300 bg-white px-3 font-medium text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-blue-700 dark:hover:bg-blue-950/40 dark:hover:text-blue-200"
              :class="!currentFolderUid ? 'border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-950/70 dark:text-blue-100' : ''"
              type="button"
              @click="emit('open-root')"
            >
              {{ isMyFiles ? "Мои файлы" : currentOwner?.fullName || "Пользователь" }}
            </button>
          </template>
          <template v-for="folder in breadcrumbs" :key="folder.uid">
            <button
              class="inline-flex h-8 max-w-48 items-center truncate rounded-md border border-slate-300 bg-white px-3 font-medium text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-blue-700 dark:hover:bg-blue-950/40 dark:hover:text-blue-200"
              :class="currentFolderUid === folder.uid ? 'border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-950/70 dark:text-blue-100' : ''"
              type="button"
              @click="emit('open-folder', folder.uid)"
            >
              {{ folder.title }}
            </button>
          </template>
        </div>
      </div>

      <div v-if="canCreateInCurrentLocation" class="flex flex-wrap items-center gap-2">
        <button
          class="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          type="button"
          @click="emit('open-folder-modal')"
        >
          <FolderPlusIcon class="h-4 w-4" aria-hidden="true" />
          <span>Папка</span>
        </button>
        <button
          class="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          type="button"
          @click="emit('create-document')"
        >
          <FileTextIcon class="h-4 w-4" aria-hidden="true" />
          <span>Документ</span>
        </button>
        <FileUploadField
          :folder-uid="currentFolderUid"
          :show-uploaded-items="false"
          @update:files="emit('uploaded-files', $event)"
        />
      </div>
    </div>
  </header>
</template>
