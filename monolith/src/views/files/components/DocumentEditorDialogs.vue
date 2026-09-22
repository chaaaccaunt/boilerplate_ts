<script lang="ts" setup>
interface TableForm {
  rows: number
  columns: number
  withHeaderRow: boolean
}

interface ActionDialogState {
  isOpen: boolean
  title: string
  inputLabel: string
  inputValue: string
  inputMaxLength: number
}

interface DialogActions {
  handleImageSelected: (event: Event) => void
  uploadImage: () => void
  insertSelectedImage: (file: iSharedFiles.UploadedFileDto) => void
  resolveImagePreviewUrl: (file: iSharedFiles.UploadedFileDto) => string
  closeImageModal: () => void
  handleAttachmentSelected: (event: Event) => void
  insertAttachment: () => void
  closeAttachmentModal: () => void
  insertTable: () => void
  closeTableModal: () => void
  finalizeDocument: () => void
  closeFinalizeModal: () => void
  submitActionDialog: () => void
  cancelActionDialog: () => void
}

defineProps<{
  isImageModalOpen: boolean
  imageFormError: string
  availableImages: iSharedFiles.UploadedFileDto[]
  isImageLibraryLoading: boolean
  isImageSubmitting: boolean
  isAttachmentModalOpen: boolean
  attachmentFormError: string
  isTableModalOpen: boolean
  tableForm: TableForm
  tableFormError: string
  isFinalizeModalOpen: boolean
  isSaving: boolean
  actionDialog: ActionDialogState
  actions: DialogActions
}>()
</script>

<template>
<teleport to="body">
  <div
    v-if="isImageModalOpen"
    class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4"
    role="dialog"
    aria-modal="true"
    aria-labelledby="image-modal-title"
  >
    <form class="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-md bg-white p-5 shadow-xl dark:bg-slate-900" @submit.prevent="actions.uploadImage">
      <h2 id="image-modal-title" class="text-lg font-semibold text-slate-950 dark:text-slate-50">Добавление изображения</h2>
      <label class="mt-4 grid gap-1 text-sm font-medium text-slate-700 dark:text-slate-200">
        Загрузить с компьютера
        <input
          class="min-h-10 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50"
          type="file"
          accept="image/*"
          @change="actions.handleImageSelected"
        >
      </label>
      <button class="modal-primary-button mt-3" type="submit" :disabled="isImageSubmitting">
        {{ isImageSubmitting ? "Загрузка" : "Загрузить и вставить" }}
      </button>

      <div class="my-5 border-t border-slate-200 dark:border-slate-700" />
      <h3 class="text-sm font-semibold text-slate-800 dark:text-slate-100">Ранее загруженные изображения</h3>
      <p v-if="isImageLibraryLoading" class="mt-3 text-sm text-slate-500 dark:text-slate-400">Загрузка изображений</p>
      <p v-else-if="!availableImages.length" class="mt-3 text-sm text-slate-500 dark:text-slate-400">В этой папке изображений пока нет</p>
      <div v-else class="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <button
          v-for="file in availableImages"
          :key="file.fileUid"
          class="overflow-hidden rounded-md border border-slate-200 bg-slate-50 text-left transition hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-950"
          type="button"
          :title="`Вставить ${file.originalName}`"
          @click="actions.insertSelectedImage(file)"
        >
          <img class="h-28 w-full object-cover" :src="actions.resolveImagePreviewUrl(file)" :alt="file.originalName">
          <span class="block truncate px-2 py-1.5 text-xs text-slate-700 dark:text-slate-200">{{ file.originalName }}</span>
        </button>
      </div>
      <div v-if="imageFormError" class="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
        {{ imageFormError }}
      </div>
      <div class="mt-5 flex justify-end gap-2">
        <button class="modal-secondary-button" type="button" :disabled="isImageSubmitting" @click="actions.closeImageModal">Закрыть</button>
      </div>
    </form>
  </div>

  <div
    v-if="isAttachmentModalOpen"
    class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4"
    role="dialog"
    aria-modal="true"
    aria-labelledby="attachment-modal-title"
  >
    <form class="w-full max-w-lg rounded-md bg-white p-5 shadow-xl dark:bg-slate-900" @submit.prevent="actions.insertAttachment">
      <h2 id="attachment-modal-title" class="text-lg font-semibold text-slate-950 dark:text-slate-50">Добавление файла</h2>
      <label class="mt-4 grid gap-1 text-sm font-medium text-slate-700 dark:text-slate-200">
        Изображение или PDF
        <input
          class="min-h-10 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50"
          type="file"
          accept="image/*,application/pdf"
          @change="actions.handleAttachmentSelected"
        >
      </label>
      <div v-if="attachmentFormError" class="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
        {{ attachmentFormError }}
      </div>
      <div class="mt-5 flex justify-end gap-2">
        <button class="modal-secondary-button" type="button" :disabled="isSaving" @click="actions.closeAttachmentModal">Отмена</button>
        <button class="modal-primary-button" type="submit" :disabled="isSaving">Добавить</button>
      </div>
    </form>
  </div>

  <div
    v-if="isTableModalOpen"
    class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4"
    role="dialog"
    aria-modal="true"
    aria-labelledby="table-modal-title"
  >
    <form class="w-full max-w-md rounded-md bg-white p-5 shadow-xl dark:bg-slate-900" @submit.prevent="actions.insertTable">
      <h2 id="table-modal-title" class="text-lg font-semibold text-slate-950 dark:text-slate-50">Добавление таблицы</h2>
      <div class="mt-4 grid gap-4 sm:grid-cols-2">
        <label class="grid gap-1 text-sm font-medium text-slate-700 dark:text-slate-200">
          Строки
          <input
            v-model.number="tableForm.rows"
            class="min-h-10 rounded-md border border-slate-300 px-3 text-sm text-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50"
            type="number"
            min="1"
            max="30"
            required
          >
        </label>
        <label class="grid gap-1 text-sm font-medium text-slate-700 dark:text-slate-200">
          Колонки
          <input
            v-model.number="tableForm.columns"
            class="min-h-10 rounded-md border border-slate-300 px-3 text-sm text-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50"
            type="number"
            min="1"
            max="12"
            required
          >
        </label>
      </div>
      <label class="mt-4 flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
        <input
          v-model="tableForm.withHeaderRow"
          class="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-950"
          type="checkbox"
        >
        Первая строка как заголовок
      </label>
      <div v-if="tableFormError" class="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
        {{ tableFormError }}
      </div>
      <div class="mt-5 flex justify-end gap-2">
        <button class="modal-secondary-button" type="button" @click="actions.closeTableModal">Отмена</button>
        <button class="modal-primary-button" type="submit">Добавить</button>
      </div>
    </form>
  </div>

  <div
    v-if="isFinalizeModalOpen"
    class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4"
    role="dialog"
    aria-modal="true"
    aria-labelledby="finalize-modal-title"
  >
    <form class="w-full max-w-md rounded-md bg-white p-5 shadow-xl dark:bg-slate-900" @submit.prevent="actions.finalizeDocument">
      <h2 id="finalize-modal-title" class="text-lg font-semibold text-slate-950 dark:text-slate-50">Завершение документа</h2>
      <p class="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
        Документ будет отмечен как завершенный. Редактирование останется доступным владельцу и администратору.
      </p>
      <div class="mt-5 flex justify-end gap-2">
        <button class="modal-secondary-button" type="button" :disabled="isSaving" @click="actions.closeFinalizeModal">Отмена</button>
        <button class="modal-primary-button" type="submit" :disabled="isSaving">Завершить</button>
      </div>
    </form>
  </div>

  <div
    v-if="actionDialog.isOpen"
    class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4"
    role="dialog"
    aria-modal="true"
    aria-labelledby="editor-action-dialog-title"
  >
    <form class="w-full max-w-md rounded-md bg-white p-5 shadow-xl dark:bg-slate-900" @submit.prevent="actions.submitActionDialog">
      <h2 id="editor-action-dialog-title" class="text-lg font-semibold text-slate-950 dark:text-slate-50">{{ actionDialog.title }}</h2>
      <label class="mt-4 grid gap-1 text-sm font-medium text-slate-700 dark:text-slate-200">
        {{ actionDialog.inputLabel }}
        <input
          v-model="actionDialog.inputValue"
          class="min-h-10 rounded-md border border-slate-300 px-3 text-sm text-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50"
          type="text"
          :maxlength="actionDialog.inputMaxLength"
          autofocus
        >
      </label>
      <div class="mt-5 flex justify-end gap-2">
        <button class="modal-secondary-button" type="button" @click="actions.cancelActionDialog">Отмена</button>
        <button class="modal-primary-button" type="submit">Сохранить</button>
      </div>
    </form>
  </div>
</teleport>
</template>
