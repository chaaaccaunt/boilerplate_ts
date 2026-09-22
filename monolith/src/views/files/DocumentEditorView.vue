<script lang="ts" setup>
import { computed, onBeforeUnmount, ref, shallowRef, watch } from "vue"
import type { ComponentPublicInstance } from "vue"
import { useRoute, useRouter } from "vue-router"
import { Editor } from "@tiptap/vue-3"
import StarterKit from "@tiptap/starter-kit"
import Link from "@tiptap/extension-link"
import Placeholder from "@tiptap/extension-placeholder"
import { TextStyle, FontFamily, FontSize, LineHeight, Color, BackgroundColor } from "@tiptap/extension-text-style"
import { Table } from "@tiptap/extension-table"
import TableCell from "@tiptap/extension-table-cell"
import TableHeader from "@tiptap/extension-table-header"
import TextAlign from "@tiptap/extension-text-align"
import Underline from "@tiptap/extension-underline"
import { useApiClient } from "@/application/api"
import { useStore } from "@/application/store"
import { ApiError } from "@/shared/api"
import {
  defaultPageMargins,
  DocumentPage,
  DocumentWithPageSettings,
  INDENT_STEP_MM,
  PAGE_GAP_MM,
  PAGE_HEIGHT_MM,
  PAGE_WIDTH_MM,
  PageBreak,
  ParagraphIndent,
  ResizableTableRow,
  RULER_CORNER_SIZE
} from "./document-editor-config"
import type { DocumentPageMargins } from "./document-editor-config"
import { useDocumentAutosave } from "./useDocumentAutosave"
import { getStoredPageMargins, parseDocumentContent } from "./document-content"
import { useActionDialog } from "./useActionDialog"
import { useDocumentPagination } from "./useDocumentPagination"
import { useDocumentRulers } from "./useDocumentRulers"
import { useDocumentEditorFormatting } from "./useDocumentEditorFormatting"
import { useDocumentEditorTable } from "./useDocumentEditorTable"
import { DocumentImage } from "./document-editor-image"
import { useDocumentEditorImage } from "./useDocumentEditorImage"
import DocumentEditorDialogs from "./components/DocumentEditorDialogs.vue"
import DocumentEditorHeader from "./components/DocumentEditorHeader.vue"
import DocumentEditorWorkspace from "./components/DocumentEditorWorkspace.vue"

const apiClient = useApiClient()
const route = useRoute()
const router = useRouter()
const store = useStore()

const documentUid = computed(() => typeof route.params.documentUid === "string" ? route.params.documentUid : "")
const document = ref<iSharedFiles.StoredDocumentDto | null>(null)
const editor = shallowRef<Editor | null>(null)
const isLoading = ref(true)
const errorMessage = ref("")
const editorStateVersion = ref(0)
const isImageModalOpen = ref(false)
const imageFormError = ref("")
const imageUploadFile = ref<File | null>(null)
const availableImages = ref<iSharedFiles.UploadedFileDto[]>([])
const isImageLibraryLoading = ref(false)
const isImageSubmitting = ref(false)
const isAttachmentModalOpen = ref(false)
const attachmentFormError = ref("")
const attachmentFile = ref<File | null>(null)
const isFinalizeModalOpen = ref(false)
const { actionDialog, openTextDialog, submitActionDialog, cancelActionDialog } = useActionDialog()
const pageMargins = ref<DocumentPageMargins>({ ...defaultPageMargins })
const { activePageIndex, updateActivePageIndex, schedulePagination: scheduleDocumentPagination } = useDocumentPagination(editor)

const currentUserUid = computed(() => store.state.authorization.user?.uid || null)
const isSuperadministrator = computed(() => store.state.authorization.user?.roles.some((role) => role.name === "superadministrator") || false)
const canManageDocument = computed(() => Boolean(document.value && (document.value.createdByUserUid === currentUserUid.value || isSuperadministrator.value)))
const isReadonly = computed(() => !canManageDocument.value)
const {
  clearFormatting,
  decreaseIndent,
  getCurrentIndentLevel,
  increaseIndent,
  setBackgroundColor,
  setBlockStyle,
  setCurrentIndent,
  setFontFamily,
  setFontSize,
  setLineHeight,
  setTextColor
} = useDocumentEditorFormatting({ editor, isReadonly })
const {
  addTableColumnAfter,
  addTableColumnBefore,
  addTableRowAfter,
  addTableRowBefore,
  canMergeTableCells,
  closeTableModal,
  deleteTable,
  deleteTableColumn,
  deleteTableRow,
  insertTable,
  isTableActive,
  isTableModalOpen,
  mergeTableCells,
  openTableModal,
  splitTableCell,
  tableForm,
  tableFormError,
  toggleTableHeaderColumn,
  toggleTableHeaderRow
} = useDocumentEditorTable({ editor, editorStateVersion, isReadonly })
const {
  imageAttributes,
  isImageActive,
  removeImage,
  rotateImage,
  setImageAlignment,
  setImageCaption,
  setImageCrop,
  setImageWidth,
  setImageWrap
} = useDocumentEditorImage({ editor, editorStateVersion, isReadonly })
const { getDocumentJsonForSave, isSaving, isDirty, saveStateText, markChanged, saveDocument } = useDocumentAutosave({
  document,
  editor,
  pageMargins,
  isReadonly,
  save: (payload) => apiClient.files.updateDocument(payload),
  onError: (error) => {
    errorMessage.value = getErrorMessage(error, "Не удалось сохранить документ")
  }
})
const {
  activeRulerTarget,
  horizontalRulerElement,
  startHorizontalRulerDrag,
  startVerticalRulerDrag,
  verticalRulerElement
} = useDocumentRulers({
  pageMargins,
  isReadonly,
  setIndent: (indentLevel) => setCurrentIndent(indentLevel),
  onLayoutChanged: markDocumentLayoutChanged
})
const currentIndentLevel = computed(() => {
  editorStateVersion.value
  return getCurrentIndentLevel()
})
const documentEditorStyle = computed(() => ({
  minHeight: `${Math.max(40, PAGE_HEIGHT_MM - pageMargins.value.top - pageMargins.value.bottom)}mm`
}))
const horizontalRulerStyle = computed(() => ({
  "--left-margin": `${getPageHorizontalPercent(pageMargins.value.left)}%`,
  "--right-margin": `${getPageHorizontalPercent(PAGE_WIDTH_MM - pageMargins.value.right)}%`,
  "--indent-position": `${getPageHorizontalPercent(pageMargins.value.left + currentIndentLevel.value * INDENT_STEP_MM)}%`,
  "--left-offset-label": `"${Math.round(pageMargins.value.left)} мм"`,
  "--right-offset-label": `"${Math.round(pageMargins.value.right)} мм"`,
  "--indent-offset-label": `"${Math.round(currentIndentLevel.value * INDENT_STEP_MM)} мм"`
}))
const verticalRulerStyle = computed(() => ({
  "--top-margin": `${getPageVerticalPercent(pageMargins.value.top)}%`,
  "--bottom-margin": `${getPageVerticalPercent(PAGE_HEIGHT_MM - pageMargins.value.bottom)}%`,
  "--active-page-offset": `${activePageIndex.value * (PAGE_HEIGHT_MM + PAGE_GAP_MM)}mm`,
  "--top-offset-label": `"${Math.round(pageMargins.value.top)} мм"`,
  "--bottom-offset-label": `"${Math.round(pageMargins.value.bottom)} мм"`
}))
const pageGuideStyle = computed(() => ({
  "--guide-left": `${pageMargins.value.left}mm`,
  "--guide-right": `${pageMargins.value.right}mm`,
  "--guide-top": `${pageMargins.value.top}mm`,
  "--guide-bottom": `${pageMargins.value.bottom}mm`,
  "--guide-indent": `${pageMargins.value.left + currentIndentLevel.value * INDENT_STEP_MM}mm`,
  "--page-padding-top": `${pageMargins.value.top}mm`,
  "--page-padding-right": `${pageMargins.value.right}mm`,
  "--page-padding-bottom": `${pageMargins.value.bottom}mm`,
  "--page-padding-left": `${pageMargins.value.left}mm`,
  "--page-gap": `${PAGE_GAP_MM}mm`
}))
const activeVerticalGuideClass = computed(() => {
  if (!activeRulerTarget.value || ["top", "bottom"].includes(activeRulerTarget.value)) return ""
  return activeRulerTarget.value === "right" ? "document-guide-right" : activeRulerTarget.value === "indent" ? "document-guide-indent" : "document-guide-left"
})
const activeHorizontalGuideClass = computed(() => {
  if (activeRulerTarget.value === "top") return "document-guide-top"
  if (activeRulerTarget.value === "bottom") return "document-guide-bottom"
  return ""
})
watch(documentUid, () => {
  loadDocument()
}, { immediate: true })

onBeforeUnmount(() => {
  editor.value?.destroy()
})

function loadDocument(): void {
  if (!documentUid.value) return

  isLoading.value = true
  errorMessage.value = ""
  saveStateText.value = "Загрузка"

  apiClient.files.getDocument(documentUid.value)
    .then((loadedDocument) => {
      document.value = loadedDocument
      createEditor(loadedDocument)
      saveStateText.value = loadedDocument.status === "final" ? "Завершен" : "Сохранено"
    })
    .catch((error) => {
      errorMessage.value = getErrorMessage(error, "Не удалось открыть документ")
    })
    .finally(() => {
      isLoading.value = false
    })
}

function createEditor(loadedDocument: iSharedFiles.StoredDocumentDto): void {
  editor.value?.destroy()
  const parsedContent = parseDocumentContent(loadedDocument.contentJson)
  pageMargins.value = getStoredPageMargins(parsedContent)
  editor.value = new Editor({
    content: parsedContent,
    editable: canManageDocument.value,
    extensions: [
      StarterKit.configure({
        document: false,
        link: false,
        underline: false
      }),
      DocumentWithPageSettings,
      DocumentPage,
      Underline,
      TextStyle,
      FontFamily,
      FontSize,
      LineHeight,
      Color,
      BackgroundColor,
      ParagraphIndent,
      PageBreak,
      Link.configure({
        openOnClick: false
      }),
      DocumentImage,
      TextAlign.configure({
        types: ["heading", "paragraph"]
      }),
      Table.configure({
        resizable: true
      }),
      ResizableTableRow,
      TableHeader,
      TableCell,
      Placeholder.configure({
        placeholder: "Начните писать документ"
      })
    ],
    onSelectionUpdate: () => {
      editorStateVersion.value += 1
      updateActivePageIndex()
    },
    onUpdate: () => {
      editorStateVersion.value += 1
      updateActivePageIndex()
      scheduleDocumentPagination()
      markChanged()
    }
  })
  updateActivePageIndex()
  scheduleDocumentPagination()
}

watch(isReadonly, (readonly) => {
  editor.value?.setEditable(!readonly)
})

function getPageHorizontalPercent(value: number): number {
  return Math.min(100, Math.max(0, (value / PAGE_WIDTH_MM) * 100))
}

function getPageVerticalPercent(value: number): number {
  return Math.min(100, Math.max(0, (value / PAGE_HEIGHT_MM) * 100))
}

function setHorizontalRulerElement(element: Element | ComponentPublicInstance | null): void {
  horizontalRulerElement.value = element instanceof HTMLElement ? element : null
}

function setVerticalRulerElement(element: Element | ComponentPublicInstance | null): void {
  verticalRulerElement.value = element instanceof HTMLElement ? element : null
}

function markDocumentLayoutChanged(): void {
  if (isReadonly.value) return

  scheduleDocumentPagination()
  markChanged()
}

function renameDocument(): void {
  if (!document.value || isReadonly.value) return

  openTextDialog("Название документа", "Название", document.value.title, 180)
    .then((title) => {
      const currentDocument = document.value
      if (!currentDocument || !title?.trim() || title.trim() === currentDocument.title) return

      document.value = {
        ...currentDocument,
        title: title.trim()
      }
      saveDocument()
    })
}

function openFinalizeModal(): void {
  if (!document.value || !editor.value || isReadonly.value) return

  isFinalizeModalOpen.value = true
}

function closeFinalizeModal(): void {
  if (isSaving.value) return

  isFinalizeModalOpen.value = false
}

function finalizeDocument(): void {
  if (!document.value || !editor.value || isReadonly.value) return

  isSaving.value = true
  apiClient.files.updateDocument({
    documentUid: document.value.documentUid,
    title: document.value.title,
    contentJson: JSON.stringify(getDocumentJsonForSave()),
    contentHtml: editor.value.getHTML(),
    status: "final"
  })
    .then((updatedDocument) => {
      document.value = updatedDocument
      editor.value?.setEditable(true)
      isDirty.value = false
      saveStateText.value = "Завершен"
      isFinalizeModalOpen.value = false
    })
    .catch((error) => {
      errorMessage.value = getErrorMessage(error, "Не удалось завершить документ")
    })
    .finally(() => {
      isSaving.value = false
    })
}

function openImageModal(): void {
  if (!editor.value || !document.value || isReadonly.value) return

  imageUploadFile.value = null
  availableImages.value = []
  imageFormError.value = ""
  isImageModalOpen.value = true
  isImageLibraryLoading.value = true

  apiClient.files.list(document.value.folderUid, document.value.createdByUserUid)
    .then((result) => {
      availableImages.value = result.files.filter((file) => file.mimeType.startsWith("image/"))
    })
    .catch((error) => {
      imageFormError.value = getErrorMessage(error, "Не удалось загрузить список изображений")
    })
    .finally(() => {
      isImageLibraryLoading.value = false
    })
}

function closeImageModal(): void {
  if (isImageSubmitting.value) return

  isImageModalOpen.value = false
  imageUploadFile.value = null
  imageFormError.value = ""
}

function handleImageSelected(event: Event): void {
  const input = event.target as HTMLInputElement
  imageUploadFile.value = input.files?.[0] || null
}

function uploadImage(): void {
  const file = imageUploadFile.value
  if (!file) {
    imageFormError.value = "Выберите изображение"
    return
  }
  if (!document.value || !editor.value || isReadonly.value) return

  isImageSubmitting.value = true
  imageFormError.value = ""
  apiClient.files.upload([file], "", document.value.folderUid)
    .then((result) => {
      const uploadedFile = result.files[0]
      if (!uploadedFile) throw new Error("Файловый сервер не вернул загруженное изображение")

      insertSelectedImage(uploadedFile)
    })
    .catch((error) => {
      imageFormError.value = getErrorMessage(error, "Не удалось загрузить изображение")
    })
    .finally(() => {
      isImageSubmitting.value = false
    })
}

function insertSelectedImage(file: iSharedFiles.UploadedFileDto): void {
  if (!file.mimeType.startsWith("image/")) return

  insertUploadedFile(file)
  isImageModalOpen.value = false
  imageUploadFile.value = null
  imageFormError.value = ""
}

function resolveImagePreviewUrl(file: iSharedFiles.UploadedFileDto): string {
  return apiClient.resolvePublicUrl((file.previewUrl || file.viewUrl || file.url) as `/${string}`)
}

function openAttachmentModal(): void {
  if (isReadonly.value) return

  attachmentFile.value = null
  attachmentFormError.value = ""
  isAttachmentModalOpen.value = true
}

function closeAttachmentModal(): void {
  if (isSaving.value) return

  isAttachmentModalOpen.value = false
  attachmentFile.value = null
  attachmentFormError.value = ""
}

function handleAttachmentSelected(event: Event): void {
  const input = event.target as HTMLInputElement
  attachmentFile.value = input.files?.[0] || null
}

function insertAttachment(): void {
  const file = attachmentFile.value
  if (!file) {
    attachmentFormError.value = "Выберите изображение или PDF-файл"
    return
  }

  if (!document.value || !editor.value || isReadonly.value) return

  isSaving.value = true
  saveStateText.value = "Загрузка файла"
  attachmentFormError.value = ""

  apiClient.files.upload([file], "", document.value.folderUid)
    .then((result) => {
      const uploadedFile = result.files[0]
      if (!uploadedFile) return

      insertUploadedFile(uploadedFile)
      closeAttachmentModal()
    })
    .catch((error) => {
      attachmentFormError.value = getErrorMessage(error, "Не удалось вставить файл")
    })
    .finally(() => {
      isSaving.value = false
    })
}

function insertUploadedFile(file: iSharedFiles.UploadedFileDto): void {
  if (!editor.value) return

  const viewUrl = file.viewUrl || file.url
  const resolvedUrl = apiClient.resolvePublicUrl(viewUrl as `/${string}`)

  if (file.mimeType.startsWith("image/")) {
    editor.value.chain().focus().setImage({ src: resolvedUrl, alt: file.originalName }).run()
    return
  }

  editor.value.chain().focus().insertContent(`<p><a href="${escapeAttribute(resolvedUrl)}">${escapeHtml(file.originalName)}</a></p>`).run()
}

function insertLink(): void {
  if (!editor.value || isReadonly.value) return

  openTextDialog("Ссылка на файл, PDF или страницу", "Ссылка", "", 2048)
    .then((href) => {
      if (!href?.trim() || !editor.value) return

      const selectedText = editor.value.state.doc.textBetween(editor.value.state.selection.from, editor.value.state.selection.to)
      if (!selectedText) {
        editor.value.chain().focus().insertContent(`<a href="${escapeAttribute(href.trim())}">${escapeHtml(href.trim())}</a>`).run()
        return
      }

      editor.value.chain().focus().setLink({ href: href.trim() }).run()
    })
}

function goBack(): void {
  router.back()
}

function downloadDocument(): void {
  if (!document.value) return
  window.open(apiClient.resolvePublicUrl(document.value.exportUrl as `/${string}`), "_blank", "noopener")
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
}

function escapeAttribute(value: string): string {
  return escapeHtml(value).replace(/"/g, "&quot;")
}

function getErrorMessage(error: unknown, defaultMessage: string): string {
  if (error instanceof ApiError || error instanceof Error) return error.message
  return defaultMessage
}
</script>

<template>
  <section class="grid h-[calc(100vh-3.5rem)] min-h-[36rem] grid-rows-[auto_minmax(0,1fr)] overflow-hidden bg-slate-100 dark:bg-slate-950">
    <DocumentEditorHeader
      :editor="editor"
      :document="document"
      :is-readonly="isReadonly"
      :can-manage-document="canManageDocument"
      :is-saving="isSaving"
      :is-dirty="isDirty"
      :save-state-text="saveStateText"
      :is-table-active="isTableActive"
      :can-merge-table-cells="canMergeTableCells"
      :is-image-active="isImageActive"
      :image-attributes="imageAttributes"
      :actions="{ goBack, renameDocument, saveDocument, downloadDocument, openFinalizeModal, setBlockStyle, setFontFamily, setFontSize, setLineHeight, setTextColor, setBackgroundColor, clearFormatting, decreaseIndent, increaseIndent, openTableModal, addTableColumnBefore, addTableColumnAfter, deleteTableColumn, addTableRowBefore, addTableRowAfter, deleteTableRow, mergeTableCells, splitTableCell, toggleTableHeaderRow, toggleTableHeaderColumn, deleteTable, openImageModal, openAttachmentModal, insertLink, setImageWidth, setImageAlignment, setImageWrap, rotateImage, setImageCrop, setImageCaption, removeImage }"
    />

    <DocumentEditorWorkspace
      :editor="editor"
      :error-message="errorMessage"
      :is-loading="isLoading"
      :is-readonly="isReadonly"
      :horizontal-ruler-style="horizontalRulerStyle"
      :vertical-ruler-style="verticalRulerStyle"
      :page-guide-style="pageGuideStyle"
      :active-vertical-guide-class="activeVerticalGuideClass"
      :active-horizontal-guide-class="activeHorizontalGuideClass"
      :actions="{ setHorizontalRulerElement, setVerticalRulerElement, startHorizontalRulerDrag, startVerticalRulerDrag }"
    />

    <DocumentEditorDialogs
      :is-image-modal-open="isImageModalOpen"
      :image-form-error="imageFormError"
      :available-images="availableImages"
      :is-image-library-loading="isImageLibraryLoading"
      :is-image-submitting="isImageSubmitting"
      :is-attachment-modal-open="isAttachmentModalOpen"
      :attachment-form-error="attachmentFormError"
      :is-table-modal-open="isTableModalOpen"
      :table-form="tableForm"
      :table-form-error="tableFormError"
      :is-finalize-modal-open="isFinalizeModalOpen"
      :is-saving="isSaving"
      :action-dialog="actionDialog"
      :actions="{ handleImageSelected, uploadImage, insertSelectedImage, resolveImagePreviewUrl, closeImageModal, handleAttachmentSelected, insertAttachment, closeAttachmentModal, insertTable, closeTableModal, finalizeDocument, closeFinalizeModal, submitActionDialog, cancelActionDialog }"
    />
  </section>
</template>

<style>
.editor-button {
  display: inline-flex;
  min-height: 2.25rem;
  width: 2.25rem;
  align-items: center;
  justify-content: center;
  border-radius: 0.375rem;
  border: 1px solid rgb(148 163 184);
  background: rgb(255 255 255);
  color: rgb(30 41 59);
  transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}

.editor-button:disabled,
.editor-text-button:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.editor-button:hover {
  border-color: rgb(59 130 246);
  background: rgb(239 246 255);
  color: rgb(30 64 175);
}

.editor-toolbar-group {
  display: inline-flex;
  min-height: 2.25rem;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.25rem;
  border: 1px solid rgb(226 232 240);
  border-radius: 0.375rem;
  background: rgb(248 250 252);
  padding: 1.05rem 0.35rem 0.35rem;
  position: relative;
}

.editor-toolbar-group::before {
  content: attr(data-label);
  position: absolute;
  top: 0.2rem;
  left: 0.45rem;
  color: rgb(71 85 105);
  font-size: 0.625rem;
  font-weight: 700;
  line-height: 1;
}

.editor-select,
.editor-text-button {
  min-height: 2.25rem;
  border-radius: 0.375rem;
  border: 1px solid rgb(148 163 184);
  background: white;
  padding: 0 0.5rem;
  color: rgb(51 65 85);
  font-size: 0.875rem;
}

.editor-text-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  white-space: nowrap;
  font-weight: 500;
}

.editor-color {
  display: inline-flex;
  min-height: 2.25rem;
  width: 2.25rem;
  align-items: center;
  justify-content: center;
  border-radius: 0.375rem;
  border: 1px solid rgb(148 163 184);
  background: white;
}

.editor-color input {
  height: 1.375rem;
  width: 1.375rem;
  cursor: pointer;
  border: 0;
  background: transparent;
  padding: 0;
}

.modal-primary-button,
.modal-secondary-button {
  display: inline-flex;
  min-height: 2.25rem;
  align-items: center;
  justify-content: center;
  border-radius: 0.375rem;
  padding: 0 0.75rem;
  font-size: 0.875rem;
  font-weight: 500;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.modal-primary-button {
  background: rgb(37 99 235);
  color: white;
}

.modal-primary-button:hover {
  background: rgb(29 78 216);
}

.modal-secondary-button {
  border: 1px solid rgb(203 213 225);
  color: rgb(51 65 85);
}

.modal-secondary-button:hover {
  background: rgb(248 250 252);
}

.modal-primary-button:disabled,
.modal-secondary-button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.document-workspace {
  min-width: calc(210mm + v-bind("RULER_CORNER_SIZE") + 0.375rem);
}

.document-ruler-frame {
  display: grid;
  grid-template-columns: v-bind("RULER_CORNER_SIZE") 210mm;
  grid-template-rows: v-bind("RULER_CORNER_SIZE") auto;
  column-gap: 0.375rem;
  row-gap: 0.375rem;
  width: calc(210mm + v-bind("RULER_CORNER_SIZE") + 0.375rem);
}

.document-ruler-corner {
  position: sticky;
  top: 0;
  z-index: 12;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgb(148 163 184);
  background: rgb(241 245 249);
  color: rgb(51 65 85);
  font-size: 0.5625rem;
  line-height: 1;
}

.document-horizontal-ruler,
.document-vertical-ruler {
  position: relative;
  overflow: hidden;
  background-color: rgb(248 250 252);
  touch-action: none;
  user-select: none;
}

.document-horizontal-ruler {
  position: sticky;
  top: 0;
  z-index: 11;
  width: 210mm;
  height: v-bind("RULER_CORNER_SIZE");
  border: 1px solid rgb(148 163 184);
}

.document-vertical-ruler {
  transform: translateY(var(--active-page-offset));
  transition: transform 0.12s ease;
  height: 297mm;
  border: 1px solid rgb(148 163 184);
}

.ruler-page-area {
  position: absolute;
  pointer-events: none;
  background: transparent;
}

.document-horizontal-ruler .ruler-page-area {
  inset: 0 calc(100% - var(--right-margin)) 0 var(--left-margin);
  border-left: 1px solid rgb(37 99 235);
  border-right: 1px solid rgb(37 99 235);
}

.document-horizontal-ruler::before,
.document-horizontal-ruler::after {
  position: absolute;
  z-index: 4;
  top: 0.25rem;
  border-radius: 9999px;
  background: rgb(219 234 254);
  padding: 0.08rem 0.35rem;
  color: rgb(30 64 175);
  font-size: 0.625rem;
  font-weight: 700;
  line-height: 1.15;
  white-space: nowrap;
}

.document-horizontal-ruler::before {
  content: var(--left-offset-label);
  left: 0.2rem;
  width: calc(var(--left-margin) - 0.4rem);
  min-width: 2.5rem;
  max-width: calc(var(--indent-position) - 0.35rem);
  overflow: hidden;
  text-align: center;
}

.document-horizontal-ruler::after {
  content: var(--right-offset-label);
  right: 0.2rem;
  width: calc(100% - var(--right-margin) - 0.4rem);
  min-width: 2.5rem;
  overflow: hidden;
  text-align: center;
}

.document-horizontal-ruler .ruler-page-area::after {
  content: var(--indent-offset-label);
  position: absolute;
  z-index: 4;
  top: 0.25rem;
  left: 0;
  width: calc(var(--indent-position) - var(--left-margin));
  min-width: 2rem;
  max-width: calc(100% - 0.4rem);
  overflow: hidden;
  border-radius: 9999px;
  background: rgb(220 252 231);
  padding: 0.08rem 0.3rem;
  color: rgb(22 101 52);
  font-size: 0.625rem;
  font-weight: 700;
  line-height: 1.15;
  text-align: center;
  white-space: nowrap;
}

.document-vertical-ruler .ruler-page-area {
  inset: var(--top-margin) 0 calc(100% - var(--bottom-margin)) 0;
  border-top: 1px solid rgb(37 99 235);
  border-bottom: 1px solid rgb(37 99 235);
}

.document-vertical-ruler::before,
.document-vertical-ruler::after {
  position: absolute;
  left: 0.18rem;
  right: 0.18rem;
  z-index: 4;
  overflow: hidden;
  border-radius: 9999px;
  background: rgb(219 234 254);
  padding: 0.08rem 0.15rem;
  color: rgb(30 64 175);
  font-size: 0.5625rem;
  font-weight: 700;
  line-height: 1.15;
  text-align: center;
  white-space: nowrap;
}

.document-vertical-ruler::before {
  content: var(--top-offset-label);
  top: 0.25rem;
}

.document-vertical-ruler::after {
  content: var(--bottom-offset-label);
  bottom: 0.25rem;
}

.ruler-tick {
  position: absolute;
  z-index: 1;
  background: rgb(100 116 139);
  pointer-events: none;
  user-select: none;
}

.ruler-tick-horizontal {
  bottom: 0;
  width: 1px;
  height: 0.46rem;
}

.ruler-tick-horizontal.ruler-tick-half {
  height: 0.72rem;
}

.ruler-tick-horizontal.ruler-tick-centimeter {
  height: 1rem;
  background: rgb(51 65 85);
}

.ruler-tick-vertical {
  right: 0;
  width: 0.46rem;
  height: 1px;
}

.ruler-tick-vertical.ruler-tick-half {
  width: 0.72rem;
}

.ruler-tick-vertical.ruler-tick-centimeter {
  width: 1rem;
  background: rgb(51 65 85);
}

.ruler-centimeter-label {
  position: absolute;
  z-index: 2;
  color: rgb(15 23 42);
  font-size: 0.625rem;
  font-weight: 700;
  line-height: 1;
  pointer-events: none;
  user-select: none;
}

.ruler-centimeter-label-horizontal {
  bottom: 1.1rem;
  transform: translateX(-50%);
}

.ruler-centimeter-label-vertical {
  right: 1.05rem;
  transform: translateY(-50%);
}

.document-page-slot {
  position: relative;
  width: 210mm;
  min-height: 297mm;
}

.ruler-marker {
  position: absolute;
  z-index: 5;
  border: 0;
  background: transparent;
  padding: 0;
  cursor: grab;
  filter: drop-shadow(0 1px 2px rgb(15 23 42 / 0.28));
}

.ruler-marker:active {
  cursor: grabbing;
}

.ruler-marker-left,
.ruler-marker-indent,
.ruler-marker-right {
  width: 0.9rem;
  height: 0.55rem;
  border-radius: 0.15rem;
  transform: translateX(-50%);
}

.ruler-marker-left {
  left: var(--left-margin);
  top: 1.15rem;
  border: 2px solid rgb(255 255 255);
  background: rgb(37 99 235);
}

.ruler-marker-left::after,
.ruler-marker-right::after {
  content: "";
  position: absolute;
  left: 50%;
  bottom: -0.35rem;
  width: 0;
  height: 0;
  transform: translateX(-50%);
  border-left: 0.22rem solid transparent;
  border-right: 0.22rem solid transparent;
  border-top: 0.35rem solid rgb(37 99 235);
}

.ruler-marker-indent {
  left: var(--indent-position);
  top: 0.34rem;
  height: 0.5rem;
  border: 2px solid rgb(255 255 255);
  border-radius: 9999px;
  background: rgb(22 163 74);
}

.ruler-marker-indent::after {
  content: "";
  position: absolute;
  left: 50%;
  top: -0.32rem;
  width: 0;
  height: 0;
  transform: translateX(-50%);
  border-left: 0.2rem solid transparent;
  border-right: 0.2rem solid transparent;
  border-bottom: 0.32rem solid rgb(22 163 74);
}

.ruler-marker-right {
  left: var(--right-margin);
  top: 1.15rem;
  border: 2px solid rgb(255 255 255);
  background: rgb(37 99 235);
}

.ruler-marker-top,
.ruler-marker-bottom {
  left: 0.2rem;
  width: 0.55rem;
  height: 0.9rem;
  border: 2px solid rgb(255 255 255);
  border-radius: 0.15rem;
  background: rgb(37 99 235);
  transform: translateY(-50%);
}

.ruler-marker-top::after,
.ruler-marker-bottom::after {
  content: "";
  position: absolute;
  top: 50%;
  right: -0.35rem;
  width: 0;
  height: 0;
  transform: translateY(-50%);
  border-top: 0.22rem solid transparent;
  border-bottom: 0.22rem solid transparent;
  border-left: 0.35rem solid rgb(37 99 235);
}

.document-guide {
  position: absolute;
  z-index: 3;
  pointer-events: none;
  background: rgba(37, 99, 235, 0.45);
}

.document-guide-vertical {
  top: 0;
  bottom: 0;
  width: 1px;
}

.document-guide-horizontal {
  right: 0;
  left: 0;
  height: 1px;
}

.document-guide-left {
  left: var(--guide-left);
}

.document-guide-right {
  right: var(--guide-right);
}

.document-guide-indent {
  left: var(--guide-indent);
}

.document-guide-top {
  top: var(--guide-top);
}

.document-guide-bottom {
  bottom: var(--guide-bottom);
}

.ruler-marker-top {
  top: var(--top-margin);
}

.ruler-marker-bottom {
  top: var(--bottom-margin);
}


.document-editor-content {
  position: relative;
  z-index: 2;
  width: 210mm;
  box-sizing: border-box;
  background: transparent;
}

.document-editor-content .ProseMirror {
  min-height: v-bind("documentEditorStyle.minHeight");
  outline: none;
  color: rgb(15 23 42);
  line-height: 1.65;
}

.document-editor-content .document-page-node {
  width: 210mm;
  height: 297mm;
  box-sizing: border-box;
  margin: 0 0 var(--page-gap);
  overflow: hidden;
  border: 1px solid rgb(226 232 240);
  border-radius: 0.125rem;
  background: rgb(255 255 255);
  box-shadow: 0 1px 2px rgb(15 23 42 / 0.08), 0 12px 28px rgb(15 23 42 / 0.08);
  padding: var(--page-padding-top) var(--page-padding-right) var(--page-padding-bottom) var(--page-padding-left);
}

.document-editor-content .document-page-node:last-child {
  margin-bottom: 0;
}

.document-editor-content .document-page-node > :first-child {
  margin-top: 0;
}

.document-editor-content .document-page-node > :last-child {
  margin-bottom: 0;
}

.document-editor-content .ProseMirror p {
  margin: 0.55rem 0;
}

.document-editor-content .ProseMirror h1 {
  margin: 1.25rem 0 0.75rem;
  font-size: 1.875rem;
  font-weight: 700;
}

.document-editor-content .ProseMirror h2 {
  margin: 1rem 0 0.625rem;
  font-size: 1.5rem;
  font-weight: 700;
}

.document-editor-content .ProseMirror h3 {
  margin: 0.875rem 0 0.5rem;
  font-size: 1.25rem;
  font-weight: 700;
}

.document-editor-content .ProseMirror ul,
.document-editor-content .ProseMirror ol {
  margin: 0.75rem 0;
  padding-left: 1.5rem;
}

.document-editor-content .ProseMirror ul {
  list-style-type: disc;
}

.document-editor-content .ProseMirror ol {
  list-style-type: decimal;
}

.document-editor-content .ProseMirror li {
  display: list-item;
  margin: 0.35rem 0;
  padding-left: 0.25rem;
}

.document-editor-content .ProseMirror li p {
  margin: 0.2rem 0;
}

.document-editor-content .ProseMirror table {
  position: relative;
  margin: 1rem 0;
  width: 100%;
  border-collapse: collapse;
  break-inside: avoid;
  page-break-inside: avoid;
}

.document-editor-content .ProseMirror td,
.document-editor-content .ProseMirror th {
  position: relative;
  min-width: 4rem;
  border: 1px solid rgb(203 213 225);
  padding: 0.5rem;
  vertical-align: top;
}

.document-editor-content .ProseMirror td.selectedCell::after,
.document-editor-content .ProseMirror th.selectedCell::after {
  content: "";
  position: absolute;
  inset: 0;
  z-index: 2;
  border: 2px solid rgb(37 99 235);
  background: rgb(59 130 246 / 0.2);
  pointer-events: none;
}

.document-editor-content .ProseMirror .column-resize-handle {
  position: absolute;
  top: 0;
  right: -2px;
  bottom: -2px;
  z-index: 4;
  width: 4px;
  background: rgb(59 130 246 / 0.65);
  pointer-events: none;
}

.document-editor-content .ProseMirror.resize-cursor {
  cursor: col-resize;
}

.document-editor-content .ProseMirror.row-resize-cursor {
  cursor: row-resize;
  user-select: none;
}

.document-editor-content .ProseMirror th {
  background: rgb(241 245 249);
  font-weight: 700;
}

.document-editor-content .ProseMirror img {
  display: block;
  max-width: 100%;
  max-height: calc(297mm - var(--page-padding-top) - var(--page-padding-bottom));
  border-radius: 0.375rem;
  break-inside: avoid;
  object-fit: contain;
  page-break-inside: avoid;
  transition: outline-color 0.15s ease;
}

.document-editor-content .ProseMirror img.ProseMirror-selectednode {
  outline: 3px solid rgb(59 130 246);
  outline-offset: 3px;
}

.document-editor-content .document-image-node {
  clear: none;
  page-break-inside: avoid;
}

.document-editor-content .document-image-node img {
  margin: 0;
}

.document-editor-content .document-image-visual {
  position: relative;
  width: 100%;
  overflow: hidden;
  border-radius: 0.375rem;
}

.document-editor-content .document-image-visual img {
  position: absolute;
  top: 50%;
  left: 50%;
  max-width: none;
  max-height: none;
  border-radius: 0;
  object-fit: cover;
  transform-origin: center;
}

.document-editor-content .document-image-node.ProseMirror-selectednode {
  outline: 3px solid rgb(59 130 246);
  outline-offset: 3px;
}

.document-editor-content .document-image-caption {
  margin-top: 0.4rem;
  color: rgb(71 85 105);
  font-size: 0.875rem;
  line-height: 1.35;
  text-align: center;
}

.document-editor-content .ProseMirror a {
  color: rgb(37 99 235);
  text-decoration: underline;
}

.document-editor-content .ProseMirror hr {
  margin: 1rem 0;
  border: 0;
  border-top: 1px solid rgb(203 213 225);
}

.document-editor-content .document-page-break {
  position: relative;
  height: 18mm;
  margin: 10mm -20mm;
  border-top: 2px dashed rgb(37 99 235);
  border-bottom: 2px dashed rgb(37 99 235);
  background: rgb(239 246 255);
  break-after: page;
  page-break-after: always;
}

.document-editor-content .document-page-break::before {
  content: "Разрыв страницы";
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  border-radius: 9999px;
  background: white;
  padding: 0.25rem 0.75rem;
  color: rgb(37 99 235);
  font-size: 0.75rem;
  font-weight: 600;
}

.dark .editor-button {
  border-color: rgb(71 85 105);
  background: rgb(15 23 42);
  color: rgb(226 232 240);
}

.dark .editor-button:hover {
  border-color: rgb(96 165 250);
  background: rgb(30 41 59);
  color: rgb(191 219 254);
}

.dark .editor-toolbar-group {
  border-color: rgb(51 65 85);
  background: rgb(15 23 42);
}

.dark .editor-toolbar-group::before {
  color: rgb(148 163 184);
}

.dark .editor-select,
.dark .editor-text-button,
.dark .editor-color {
  border-color: rgb(51 65 85);
  background: rgb(15 23 42);
  color: rgb(226 232 240);
}

.dark .modal-secondary-button {
  border-color: rgb(51 65 85);
  color: rgb(226 232 240);
}

.dark .modal-secondary-button:hover {
  background: rgb(30 41 59);
}

.dark .document-ruler-corner,
.dark .document-horizontal-ruler,
.dark .document-vertical-ruler {
  border-color: rgb(71 85 105);
  background-color: rgb(15 23 42);
  color: rgb(226 232 240);
}

.dark .ruler-tick {
  background: rgb(100 116 139);
}

.dark .ruler-tick-centimeter {
  background: rgb(203 213 225);
}

.dark .ruler-centimeter-label {
  color: rgb(248 250 252);
}

.dark .document-horizontal-ruler::before,
.dark .document-horizontal-ruler::after,
.dark .document-vertical-ruler::before,
.dark .document-vertical-ruler::after {
  background: rgb(30 58 138);
  color: rgb(219 234 254);
}

.dark .document-horizontal-ruler .ruler-page-area::after {
  background: rgb(20 83 45);
  color: rgb(220 252 231);
}

.dark .document-editor-content {
  background: transparent;
}

.dark .document-editor-content .document-page-node {
  border-color: rgb(51 65 85);
  background: rgb(15 23 42);
  box-shadow: 0 1px 2px rgb(0 0 0 / 0.26), 0 12px 28px rgb(0 0 0 / 0.28);
}

.dark .document-editor-content .document-page-break {
  background: rgb(23 37 84);
  border-color: rgb(96 165 250);
}

.dark .document-editor-content .document-page-break::before {
  background: rgb(15 23 42);
  color: rgb(191 219 254);
}

.dark .document-editor-content .ProseMirror th {
  background: rgb(30 41 59);
}

.dark .document-editor-content .ProseMirror td,
.dark .document-editor-content .ProseMirror th {
  border-color: rgb(71 85 105);
}

.dark .document-editor-content .ProseMirror td.selectedCell::after,
.dark .document-editor-content .ProseMirror th.selectedCell::after {
  border-color: rgb(96 165 250);
  background: rgb(59 130 246 / 0.3);
}
</style>
