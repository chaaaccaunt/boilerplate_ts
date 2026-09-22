import type { Editor } from "@tiptap/vue-3"
import "@tiptap/extension-table"
import { computed, ref } from "vue"
import type { Ref, ShallowRef } from "vue"

interface DocumentEditorTableOptions {
  editor: ShallowRef<Editor | null>
  editorStateVersion: Ref<number>
  isReadonly: Readonly<Ref<boolean>>
}

export function useDocumentEditorTable(options: DocumentEditorTableOptions) {
  const { editor, editorStateVersion, isReadonly } = options
  const isTableModalOpen = ref(false)
  const tableFormError = ref("")
  const tableForm = ref({
    rows: 4,
    columns: 4,
    withHeaderRow: true
  })
  const isTableActive = computed(() => {
    editorStateVersion.value
    return Boolean(editor.value?.isActive("table"))
  })
  const canMergeTableCells = computed(() => {
    editorStateVersion.value
    return Boolean(editor.value?.can().mergeCells())
  })

  function openTableModal(): void {
    if (!editor.value || isReadonly.value) return

    tableForm.value = {
      rows: 4,
      columns: 4,
      withHeaderRow: true
    }
    tableFormError.value = ""
    isTableModalOpen.value = true
  }

  function closeTableModal(): void {
    isTableModalOpen.value = false
    tableFormError.value = ""
  }

  function insertTable(): void {
    if (!editor.value || isReadonly.value) return

    const rows = Math.round(Number(tableForm.value.rows))
    const columns = Math.round(Number(tableForm.value.columns))
    if (!Number.isFinite(rows) || rows < 1 || rows > 30) {
      tableFormError.value = "Количество строк должно быть от 1 до 30"
      return
    }
    if (!Number.isFinite(columns) || columns < 1 || columns > 12) {
      tableFormError.value = "Количество колонок должно быть от 1 до 12"
      return
    }

    editor.value.chain().focus().insertTable({
      rows,
      cols: columns,
      withHeaderRow: tableForm.value.withHeaderRow
    }).run()
    closeTableModal()
  }

  function addTableColumnBefore(): void {
    editor.value?.chain().focus().addColumnBefore().run()
  }

  function addTableColumnAfter(): void {
    editor.value?.chain().focus().addColumnAfter().run()
  }

  function deleteTableColumn(): void {
    editor.value?.chain().focus().deleteColumn().run()
  }

  function addTableRowBefore(): void {
    editor.value?.chain().focus().addRowBefore().run()
  }

  function addTableRowAfter(): void {
    editor.value?.chain().focus().addRowAfter().run()
  }

  function deleteTableRow(): void {
    editor.value?.chain().focus().deleteRow().run()
  }

  function mergeTableCells(): void {
    editor.value?.chain().focus().mergeCells().run()
  }

  function splitTableCell(): void {
    editor.value?.chain().focus().splitCell().run()
  }

  function toggleTableHeaderRow(): void {
    editor.value?.chain().focus().toggleHeaderRow().run()
  }

  function toggleTableHeaderColumn(): void {
    editor.value?.chain().focus().toggleHeaderColumn().run()
  }

  function deleteTable(): void {
    editor.value?.chain().focus().deleteTable().run()
  }

  return {
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
  }
}
