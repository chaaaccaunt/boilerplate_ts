import { computed, ref } from "vue"
import type { ComputedRef } from "vue"

type ManageableEntity = { createdByUserUid: string }

export function useFilesSelection(
  folders: ComputedRef<iSharedFiles.FileFolderDto[]>,
  files: ComputedRef<iSharedFiles.UploadedFileDto[]>,
  documents: ComputedRef<iSharedFiles.StoredDocumentListItemDto[]>,
  canManage: (entity: ManageableEntity) => boolean
) {
  const selectedTileKeys = ref<string[]>([])
  const selectedFolders = computed(() => folders.value.filter((folder) => selectedTileKeys.value.includes(`folder:${folder.uid}`)))
  const selectedFiles = computed(() => files.value.filter((file) => selectedTileKeys.value.includes(`file:${file.fileUid}`)))
  const selectedDocuments = computed(() => documents.value.filter((document) => selectedTileKeys.value.includes(`document:${document.documentUid}`)))
  const selectedItemsCount = computed(() => selectedFolders.value.length + selectedFiles.value.length + selectedDocuments.value.length)
  const selectableItemsCount = computed(() => folders.value.filter(canManage).length + files.value.filter(canManage).length + documents.value.filter(canManage).length)
  const canManageCurrentItems = computed(() => selectableItemsCount.value > 0)
  const areAllItemsSelected = computed(() => selectableItemsCount.value > 0 && selectedItemsCount.value === selectableItemsCount.value)

  function toggleTileSelection(selectionKey: string): void {
    selectedTileKeys.value = selectedTileKeys.value.includes(selectionKey)
      ? selectedTileKeys.value.filter((key) => key !== selectionKey)
      : selectedTileKeys.value.concat(selectionKey)
  }

  function toggleAllItemsSelection(): void {
    if (areAllItemsSelected.value) {
      clearSelection()
      return
    }

    selectedTileKeys.value = folders.value.filter(canManage).map((folder) => `folder:${folder.uid}`)
      .concat(files.value.filter(canManage).map((file) => `file:${file.fileUid}`))
      .concat(documents.value.filter(canManage).map((document) => `document:${document.documentUid}`))
  }

  function clearSelection(): void {
    selectedTileKeys.value = []
  }

  return {
    selectedTileKeys,
    selectedFolders,
    selectedFiles,
    selectedDocuments,
    selectedItemsCount,
    canManageCurrentItems,
    areAllItemsSelected,
    toggleTileSelection,
    toggleAllItemsSelection,
    clearSelection
  }
}
