import { onBeforeUnmount, ref } from "vue"
import type { Ref, ShallowRef } from "vue"
import type { Editor } from "@tiptap/vue-3"
import type { DocumentPageMargins } from "./document-editor-config"

interface DocumentAutosaveOptions {
  document: Ref<iSharedFiles.StoredDocumentDto | null>
  editor: ShallowRef<Editor | null>
  pageMargins: Ref<DocumentPageMargins>
  isReadonly: Ref<boolean>
  save: (payload: iSharedFiles.UpdateDocumentPayloadDto) => Promise<iSharedFiles.StoredDocumentDto>
  onError: (error: unknown) => void
}

export function useDocumentAutosave(options: DocumentAutosaveOptions) {
  const isSaving = ref(false)
  const isDirty = ref(false)
  const saveStateText = ref("Загрузка")
  let timer: number | null = null

  function schedule(): void {
    if (options.isReadonly.value) return
    if (timer !== null) window.clearTimeout(timer)
    timer = window.setTimeout(() => {
      timer = null
      saveDocument()
    }, 5000)
  }

  function markChanged(): void {
    isDirty.value = true
    saveStateText.value = "Есть изменения"
    schedule()
  }

  function saveDocument(): Promise<void> {
    const document = options.document.value
    const editor = options.editor.value
    if (!document || !editor || options.isReadonly.value) return Promise.resolve()

    isSaving.value = true
    saveStateText.value = "Сохранение"
    return options.save({
      documentUid: document.documentUid,
      title: document.title,
      contentJson: JSON.stringify(getDocumentJsonForSave()),
      contentHtml: editor.getHTML()
    })
      .then((updatedDocument) => {
        options.document.value = updatedDocument
        isDirty.value = false
        saveStateText.value = "Сохранено"
      })
      .catch((error) => {
        saveStateText.value = "Ошибка сохранения"
        options.onError(error)
      })
      .finally(() => {
        isSaving.value = false
      })
  }

  function getDocumentJsonForSave(): Record<string, unknown> {
    const documentJson = options.editor.value?.getJSON() as Record<string, unknown>
    const attrs = documentJson.attrs && typeof documentJson.attrs === "object" ? documentJson.attrs as Record<string, unknown> : {}

    return {
      ...documentJson,
      attrs: {
        ...attrs,
        pageMargins: options.pageMargins.value
      }
    }
  }

  onBeforeUnmount(() => {
    if (timer !== null) window.clearTimeout(timer)
  })

  return { getDocumentJsonForSave, isSaving, isDirty, saveStateText, markChanged, saveDocument }
}
