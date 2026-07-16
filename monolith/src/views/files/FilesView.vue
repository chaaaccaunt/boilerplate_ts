<script lang="ts" setup>
import { computed, onMounted, onUnmounted, ref, watch } from "vue"
import { useRoute, useRouter } from "vue-router"
import { useApiClient } from "@/application/api"
import { useWebSocketClient } from "@/application/realtime"
import { useStore } from "@/application/store"
import { MediaViewerModal, type MediaViewerFile } from "@/features/media-viewer"
import { ApiError } from "@/shared/api"
import FileFolderCreateModal from "./components/FileFolderCreateModal.vue"
import FileOwnersGrid from "./components/FileOwnersGrid.vue"
import FilesContentGrid from "./components/FilesContentGrid.vue"
import FilesHeader from "./components/FilesHeader.vue"

const apiClient = useApiClient()
const webSocketClient = useWebSocketClient()
const store = useStore()
const route = useRoute()
const router = useRouter()

const filesRealtimeEvents: iSharedFiles.FilesRealtimeEventName[] = [
  "files:file:created",
  "files:file:updated",
  "files:file:deleted",
  "files:folder:created",
  "files:folder:updated",
  "files:folder:deleted",
  "files:document:created",
  "files:document:updated",
  "files:document:deleted"
]

const isLoading = ref(false)
const errorMessage = ref("")
const viewerFile = ref<MediaViewerFile | null>(null)
const isViewerOpen = ref(false)
const isFolderModalOpen = ref(false)
const isFolderSubmitting = ref(false)
const folderFormError = ref("")
const isDocumentModalOpen = ref(false)
const isDocumentSubmitting = ref(false)
const documentFormError = ref("")
const documentForm = ref({
  title: "Новый документ",
  visibility: "public" as iSharedFiles.FileVisibility
})
const failedPreviewFileUids = ref<string[]>([])
const selectedTileKeys = ref<string[]>([])
const isBulkDownloading = ref(false)
const bulkDownloadPhase = ref<"idle" | "preparing" | "downloading" | "finalizing">("idle")
const bulkDownloadProgress = ref<number | null>(null)
const realtimeReloadTimer = ref<number | null>(null)

const routeName = computed(() => typeof route.name === "string" ? route.name : "files")
const isOwnersOverview = computed(() => routeName.value === "files")
const isMyFiles = computed(() => routeName.value === "files-my")
const selectedOwnerUserUid = computed(() => {
  if (isMyFiles.value) return currentUserUid.value
  const userUid = route.params.userUid
  return typeof userUid === "string" && userUid.trim() ? userUid : null
})
const currentFolderUid = computed(() => {
  const value = route.query.folderUid
  return typeof value === "string" && value.trim() ? value : null
})
const owners = computed(() => store.state.files.owners)
const currentOwner = computed(() => store.state.files.currentOwner)
const currentFolder = computed(() => store.state.files.currentFolder)
const folders = computed(() => store.state.files.folders)
const files = computed(() => store.state.files.files)
const documents = computed(() => store.state.files.documents)
const breadcrumbs = computed(() => store.state.files.breadcrumbs)
const currentUserUid = computed(() => store.state.authorization.user?.uid || null)
const isSuperadministrator = computed(() => store.state.authorization.user?.roles.some((role) => role.name === "superadministrator") || false)
const canCreateInCurrentLocation = computed(() => isOwnersOverview.value || isMyFiles.value || currentOwner.value?.userUid === currentUserUid.value)
const selectedFolders = computed(() => folders.value.filter((folder) => selectedTileKeys.value.includes(getFolderSelectionKey(folder.uid))))
const selectedFiles = computed(() => files.value.filter((file) => selectedTileKeys.value.includes(getFileSelectionKey(file.fileUid))))
const selectedDocuments = computed(() => documents.value.filter((document) => selectedTileKeys.value.includes(getDocumentSelectionKey(document.documentUid))))
const selectedItemsCount = computed(() => selectedFolders.value.length + selectedFiles.value.length + selectedDocuments.value.length)
const selectableFolders = computed(() => folders.value.filter((folder) => canManage(folder)))
const selectableFiles = computed(() => files.value.filter((file) => canManage(file)))
const selectableDocuments = computed(() => documents.value.filter((document) => canManage(document)))
const selectableItemsCount = computed(() => selectableFolders.value.length + selectableFiles.value.length + selectableDocuments.value.length)
const canManageCurrentItems = computed(() => selectableItemsCount.value > 0)
const areAllItemsSelected = computed(() => selectableItemsCount.value > 0 && selectedItemsCount.value === selectableItemsCount.value)
const bulkDownloadButtonText = computed(() => {
  if (bulkDownloadPhase.value === "preparing") return "Подготовка"
  if (bulkDownloadPhase.value === "downloading") {
    return bulkDownloadProgress.value === null
      ? "Скачивание"
      : `${bulkDownloadProgress.value}%`
  }
  if (bulkDownloadPhase.value === "finalizing") return "Завершение"
  return "Скачать"
})
const title = computed(() => {
  if (isOwnersOverview.value) return "Файлы"
  if (isMyFiles.value) return "Мои файлы"
  return currentOwner.value?.fullName || "Файлы пользователя"
})

onMounted(() => {
  filesRealtimeEvents.forEach((eventName) => {
    webSocketClient.on<iSharedFiles.FilesRealtimeEventPayloadDto>(eventName, scheduleRealtimeContentReload)
  })
  loadContent()
})

onUnmounted(() => {
  filesRealtimeEvents.forEach((eventName) => {
    webSocketClient.off(eventName)
  })

  if (realtimeReloadTimer.value !== null) {
    window.clearTimeout(realtimeReloadTimer.value)
    realtimeReloadTimer.value = null
  }
})

watch(() => route.fullPath, () => {
  clearSelection()
  loadContent()
})

function loadContent(): void {
  isLoading.value = true
  errorMessage.value = ""
  failedPreviewFileUids.value = []

  const request = isOwnersOverview.value
    ? apiClient.files.listOwners()
    : apiClient.files.list(currentFolderUid.value, selectedOwnerUserUid.value)

  request
    .catch((error) => {
      errorMessage.value = getErrorMessage(error, "Не удалось загрузить файлы")
    })
    .finally(() => {
      isLoading.value = false
    })
}

function scheduleRealtimeContentReload(): void {
  if (realtimeReloadTimer.value !== null) {
    window.clearTimeout(realtimeReloadTimer.value)
  }

  realtimeReloadTimer.value = window.setTimeout(() => {
    realtimeReloadTimer.value = null
    clearSelection()
    loadContent()
  }, 150)
}

function openRoot(): void {
  if (isMyFiles.value) {
    router.push({ name: "files-my" })
    return
  }

  if (currentOwner.value) {
    router.push({ name: "files-user", params: { userUid: currentOwner.value.userUid } })
    return
  }

  router.push({ name: "files" })
}

function openOwnersOverview(): void {
  router.push({ name: "files" })
}

function openOwner(owner: iSharedFiles.FileOwnerDto): void {
  router.push({ name: "files-user", params: { userUid: owner.userUid } })
}

function openFolder(folderUid: string): void {
  if (isMyFiles.value) {
    router.push({ name: "files-my", query: { folderUid } })
    return
  }

  router.push({ name: "files-user", params: { userUid: currentOwner.value?.userUid || selectedOwnerUserUid.value || "" }, query: { folderUid } })
}

function openFolderModal(): void {
  folderFormError.value = ""
  isFolderModalOpen.value = true
}

function closeFolderModal(): void {
  if (isFolderSubmitting.value) return
  isFolderModalOpen.value = false
  folderFormError.value = ""
}

function createFolder(payload: { title: string, visibility: iSharedFiles.FileVisibility }): void {
  if (!canCreateInCurrentLocation.value) return

  const title = payload.title.trim()
  if (!title) {
    folderFormError.value = "Укажите название папки"
    return
  }

  isFolderSubmitting.value = true
  folderFormError.value = ""
  apiClient.files.createFolder({
    title,
    ...(currentFolderUid.value ? { parentFolderUid: currentFolderUid.value } : {}),
    visibility: payload.visibility
  })
    .then(() => {
      isFolderSubmitting.value = false
      closeFolderModal()
      if (isOwnersOverview.value) {
        router.push({ name: "files-my" })
        return
      }

      loadContent()
    })
    .catch((error) => {
      folderFormError.value = getErrorMessage(error, "Не удалось создать папку")
    })
    .finally(() => {
      isFolderSubmitting.value = false
    })
}

function handleUploadedFiles(uploadedFiles: iSharedFiles.UploadedFileDto[]): void {
  if (!uploadedFiles.length) return

  if (isOwnersOverview.value) {
    router.push({ name: "files-my" })
    return
  }

  loadContent()
}

function openDocumentModal(): void {
  if (!canCreateInCurrentLocation.value) return

  documentForm.value = {
    title: "Новый документ",
    visibility: "public"
  }
  documentFormError.value = ""
  isDocumentModalOpen.value = true
}

function closeDocumentModal(): void {
  if (isDocumentSubmitting.value) return

  isDocumentModalOpen.value = false
  documentFormError.value = ""
}

function createDocument(): void {
  if (!canCreateInCurrentLocation.value) return

  const title = documentForm.value.title.trim()
  if (!title) {
    documentFormError.value = "Укажите название документа"
    return
  }

  isDocumentSubmitting.value = true
  documentFormError.value = ""
  apiClient.files.createDocument({
    title,
    ...(currentFolderUid.value ? { folderUid: currentFolderUid.value } : {}),
    visibility: documentForm.value.visibility
  })
    .then((document) => {
      isDocumentModalOpen.value = false
      router.push({ name: "files-document", params: { documentUid: document.documentUid } })
    })
    .catch((error) => {
      documentFormError.value = getErrorMessage(error, "Не удалось создать документ")
    })
    .finally(() => {
      isDocumentSubmitting.value = false
    })
}

function renameFolder(folder: iSharedFiles.FileFolderDto): void {
  const title = window.prompt("Новое название папки", folder.title)
  if (!title?.trim() || title.trim() === folder.title) return

  apiClient.files.updateFolder({
    folderUid: folder.uid,
    title: title.trim()
  })
    .catch((error) => {
      errorMessage.value = getErrorMessage(error, "Не удалось переименовать папку")
    })
}

function deleteFolder(folder: iSharedFiles.FileFolderDto): void {
  if (!window.confirm(`Удалить папку "${folder.title}"?`)) return

  apiClient.files.deleteFolder({ folderUid: folder.uid })
    .catch((error) => {
      errorMessage.value = getErrorMessage(error, "Не удалось удалить папку")
    })
}

function renameFile(file: iSharedFiles.UploadedFileDto): void {
  const description = window.prompt("Описание файла", file.description || "")
  if (description === null) return

  apiClient.files.update({
    fileUid: file.fileUid,
    description: description.trim() || undefined
  })
    .catch((error) => {
      errorMessage.value = getErrorMessage(error, "Не удалось обновить файл")
    })
}

function deleteFile(file: iSharedFiles.UploadedFileDto): void {
  if (!window.confirm(`Удалить файл "${file.originalName}"?`)) return

  apiClient.files.delete({ fileUid: file.fileUid })
    .catch((error) => {
      errorMessage.value = getErrorMessage(error, "Не удалось удалить файл")
    })
}

function openDocument(document: iSharedFiles.StoredDocumentDto): void {
  router.push({ name: "files-document", params: { documentUid: document.documentUid } })
}

function downloadDocument(document: iSharedFiles.StoredDocumentDto): void {
  window.open(resolveFileUrl(document.exportUrl), "_blank", "noopener")
}

function renameDocument(document: iSharedFiles.StoredDocumentDto): void {
  const title = window.prompt("Новое название документа", document.title)
  if (!title?.trim() || title.trim() === document.title) return

  apiClient.files.updateDocument({
    documentUid: document.documentUid,
    title: title.trim()
  })
    .catch((error) => {
      errorMessage.value = getErrorMessage(error, "Не удалось переименовать документ")
    })
}

function deleteDocument(document: iSharedFiles.StoredDocumentDto): void {
  if (!window.confirm(`Удалить документ "${document.title}"?`)) return

  apiClient.files.deleteDocument({ documentUid: document.documentUid })
    .catch((error) => {
      errorMessage.value = getErrorMessage(error, "Не удалось удалить документ")
    })
}

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
  return selectedTileKeys.value.includes(selectionKey)
}

function toggleTileSelection(selectionKey: string): void {
  selectedTileKeys.value = isTileSelected(selectionKey)
    ? selectedTileKeys.value.filter((key) => key !== selectionKey)
    : selectedTileKeys.value.concat(selectionKey)
}

function toggleAllItemsSelection(): void {
  if (areAllItemsSelected.value) {
    clearSelection()
    return
  }

  selectedTileKeys.value = folders.value
    .filter((folder) => canManage(folder))
    .map((folder) => getFolderSelectionKey(folder.uid))
    .concat(files.value.filter((file) => canManage(file)).map((file) => getFileSelectionKey(file.fileUid)))
    .concat(documents.value.filter((document) => canManage(document)).map((document) => getDocumentSelectionKey(document.documentUid)))
}

function clearSelection(): void {
  selectedTileKeys.value = []
}

function bulkSetVisibility(visibility: iSharedFiles.FileVisibility): void {
  if (!selectedItemsCount.value) return

  Promise.all([
    ...selectedFolders.value.map((folder) => apiClient.files.updateFolder({ folderUid: folder.uid, visibility })),
    ...selectedFiles.value.map((file) => apiClient.files.update({ fileUid: file.fileUid, visibility })),
    ...selectedDocuments.value.map((document) => apiClient.files.updateDocument({ documentUid: document.documentUid, visibility }))
  ])
    .then(() => {
      clearSelection()
      loadContent()
    })
    .catch((error) => {
      errorMessage.value = getErrorMessage(error, "Не удалось изменить видимость выбранных элементов")
    })
}

function bulkDeleteSelected(): void {
  if (!selectedItemsCount.value) return
  if (!window.confirm(`Удалить выбранные элементы: ${selectedItemsCount.value}?`)) return

  Promise.all([
    ...selectedFolders.value.map((folder) => apiClient.files.deleteFolder({ folderUid: folder.uid })),
    ...selectedFiles.value.map((file) => apiClient.files.delete({ fileUid: file.fileUid })),
    ...selectedDocuments.value.map((document) => apiClient.files.deleteDocument({ documentUid: document.documentUid }))
  ])
    .then(() => {
      clearSelection()
      loadContent()
    })
    .catch((error) => {
      errorMessage.value = getErrorMessage(error, "Не удалось удалить выбранные элементы")
    })
}

function bulkDownloadSelected(): void {
  if ((!selectedFiles.value.length && !selectedDocuments.value.length) || isBulkDownloading.value) return

  selectedDocuments.value.forEach((document) => {
    downloadDocument(document)
  })

  if (!selectedFiles.value.length) {
    clearSelection()
    return
  }

  isBulkDownloading.value = true
  bulkDownloadPhase.value = "preparing"
  bulkDownloadProgress.value = null
  errorMessage.value = ""

  apiClient.files.createArchive({
    fileUids: selectedFiles.value.map((file) => file.fileUid)
  })
    .then((archive) => {
      bulkDownloadPhase.value = "downloading"
      bulkDownloadProgress.value = 0

      return apiClient.files.downloadArchive(archive.url, (progress) => {
        bulkDownloadProgress.value = progress
      })
      .then((blob) => {
        saveBlob(blob, "files.zip")
        bulkDownloadPhase.value = "finalizing"
        bulkDownloadProgress.value = 100
        return apiClient.files.confirmArchiveDownload({ archiveUid: archive.archiveUid }).catch(() => undefined)
      })
    })
    .then(() => {
      clearSelection()
    })
    .catch((error) => {
      errorMessage.value = getErrorMessage(error, "Не удалось скачать выбранные файлы")
    })
    .finally(() => {
      isBulkDownloading.value = false
      bulkDownloadPhase.value = "idle"
      bulkDownloadProgress.value = null
    })
}

function saveBlob(blob: Blob, fileName: string): void {
  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = objectUrl
  link.download = fileName
  link.style.display = "none"
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
}

function openViewer(file: iSharedFiles.UploadedFileDto): void {
  if (!file.viewUrl) return

  viewerFile.value = {
    originalName: file.originalName,
    mimeType: file.mimeType,
    viewUrl: resolveFileUrl(file.viewUrl),
    downloadUrl: resolveFileUrl(file.url)
  }
  isViewerOpen.value = true
}

function copyFileLink(file: iSharedFiles.UploadedFileDto): void {
  const link = resolveFileUrl(file.viewUrl || file.url)

  copyText(link)
    .catch(() => {
      errorMessage.value = "Не удалось скопировать ссылку"
    })
}

function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text)
  }

  return new Promise((resolvePromise, rejectPromise) => {
    const textarea = document.createElement("textarea")
    textarea.value = text
    textarea.setAttribute("readonly", "true")
    textarea.style.position = "fixed"
    textarea.style.left = "-9999px"
    textarea.style.top = "0"
    document.body.appendChild(textarea)
    textarea.select()

    const isCopied = document.execCommand("copy")
    document.body.removeChild(textarea)

    if (isCopied) {
      resolvePromise()
      return
    }

    rejectPromise(new Error("Не удалось скопировать текст"))
  })
}

function markPreviewFailed(fileUid: string): void {
  if (failedPreviewFileUids.value.includes(fileUid)) return
  failedPreviewFileUids.value = failedPreviewFileUids.value.concat(fileUid)
}

function hasPreview(file: iSharedFiles.UploadedFileDto): boolean {
  return Boolean(file.previewUrl && !failedPreviewFileUids.value.includes(file.fileUid))
}

function canManage(entity: { createdByUserUid: string }): boolean {
  return isSuperadministrator.value || entity.createdByUserUid === currentUserUid.value
}

function resolveFileUrl(path: string): string {
  return apiClient.resolvePublicUrl(path as `/${string}`)
}

function getErrorMessage(error: unknown, defaultMessage: string): string {
  if (error instanceof ApiError || error instanceof Error) return error.message
  return defaultMessage
}
</script>

<template>
  <section class="grid min-h-[calc(100vh-3.5rem)] grid-rows-[auto_minmax(0,1fr)] bg-slate-50 dark:bg-slate-950">
    <FilesHeader
      :title="title"
      :is-owners-overview="isOwnersOverview"
      :is-my-files="isMyFiles"
      :current-folder-uid="currentFolderUid"
      :current-owner="currentOwner"
      :breadcrumbs="breadcrumbs"
      :can-create-in-current-location="canCreateInCurrentLocation"
      @open-owners-overview="openOwnersOverview"
      @open-root="openRoot"
      @open-folder="openFolder"
      @open-folder-modal="openFolderModal"
      @create-document="openDocumentModal"
      @uploaded-files="handleUploadedFiles"
    />

    <div class="min-h-0 overflow-auto p-4">
      <div v-if="errorMessage" class="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
        {{ errorMessage }}
      </div>

      <div v-if="isLoading" class="rounded-md border border-slate-200 bg-white px-4 py-6 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
        Загрузка файлов
      </div>

      <div v-else class="grid gap-3">
        <FileOwnersGrid
          v-if="isOwnersOverview"
          :owners="owners"
          @open-owner="openOwner"
        />

        <FilesContentGrid
          v-else
          :folders="folders"
          :files="files"
          :documents="documents"
          :current-folder="currentFolder"
          :selected-tile-keys="selectedTileKeys"
          :can-manage-current-items="canManageCurrentItems"
          :are-all-items-selected="areAllItemsSelected"
          :selected-items-count="selectedItemsCount"
          :selected-files-count="selectedFiles.length"
          :selected-documents-count="selectedDocuments.length"
          :is-bulk-downloading="isBulkDownloading"
          :bulk-download-button-text="bulkDownloadButtonText"
          :can-manage="canManage"
          :resolve-file-url="resolveFileUrl"
          :has-preview="hasPreview"
          @toggle-all="toggleAllItemsSelection"
          @download-selected="bulkDownloadSelected"
          @set-visibility="bulkSetVisibility"
          @delete-selected="bulkDeleteSelected"
          @toggle-selection="toggleTileSelection"
          @open-folder="openFolder"
          @rename-folder="renameFolder"
          @delete-folder="deleteFolder"
          @open-file="openViewer"
          @copy-file-link="copyFileLink"
          @rename-file="renameFile"
          @delete-file="deleteFile"
          @open-document="openDocument"
          @download-document="downloadDocument"
          @rename-document="renameDocument"
          @delete-document="deleteDocument"
          @preview-error="markPreviewFailed"
        />
      </div>
    </div>

    <MediaViewerModal v-model="isViewerOpen" :file="viewerFile" />

    <FileFolderCreateModal
      :model-value="isFolderModalOpen"
      :current-folder="currentFolder"
      :is-submitting="isFolderSubmitting"
      :error-message="folderFormError"
      @update:model-value="$event ? openFolderModal() : closeFolderModal()"
      @submit="createFolder"
    />

    <teleport to="body">
      <div
        v-if="isDocumentModalOpen"
        class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="document-create-title"
      >
        <form class="w-full max-w-md rounded-md bg-white p-5 shadow-xl dark:bg-slate-900" @submit.prevent="createDocument">
          <div class="mb-4">
            <h2 id="document-create-title" class="text-lg font-semibold text-slate-950 dark:text-slate-50">Создание документа</h2>
          </div>

          <div class="grid gap-4">
            <label class="grid gap-1 text-sm font-medium text-slate-700 dark:text-slate-200">
              Название
              <input
                v-model="documentForm.title"
                class="min-h-10 rounded-md border border-slate-300 px-3 text-sm text-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50"
                type="text"
                maxlength="180"
                required
                autofocus
              >
            </label>

            <label class="grid gap-1 text-sm font-medium text-slate-700 dark:text-slate-200">
              Видимость
              <select
                v-model="documentForm.visibility"
                class="min-h-10 rounded-md border border-slate-300 px-3 text-sm text-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50"
              >
                <option value="public">Доступен</option>
                <option value="private">Скрыт</option>
              </select>
            </label>
          </div>

          <div v-if="documentFormError" class="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
            {{ documentFormError }}
          </div>

          <div class="mt-5 flex justify-end gap-2">
            <button
              class="inline-flex min-h-9 items-center justify-center rounded-md border border-slate-300 px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              type="button"
              :disabled="isDocumentSubmitting"
              @click="closeDocumentModal"
            >
              Отмена
            </button>
            <button
              class="inline-flex min-h-9 items-center justify-center rounded-md bg-blue-600 px-3 text-sm font-medium text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-400"
              type="submit"
              :disabled="isDocumentSubmitting"
            >
              Создать
            </button>
          </div>
        </form>
      </div>
    </teleport>
  </section>
</template>
