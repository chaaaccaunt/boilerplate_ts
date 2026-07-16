<script lang="ts" setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue"
import { useRoute, useRouter } from "vue-router"
import { Editor, EditorContent } from "@tiptap/vue-3"
import { Extension, Node } from "@tiptap/core"
import type { Node as ProseMirrorNode } from "@tiptap/pm/model"
import Document from "@tiptap/extension-document"
import StarterKit from "@tiptap/starter-kit"
import Image from "@tiptap/extension-image"
import Link from "@tiptap/extension-link"
import Placeholder from "@tiptap/extension-placeholder"
import { TextStyle, FontFamily, FontSize, LineHeight, Color, BackgroundColor } from "@tiptap/extension-text-style"
import { Table } from "@tiptap/extension-table"
import TableCell from "@tiptap/extension-table-cell"
import TableHeader from "@tiptap/extension-table-header"
import TableRow from "@tiptap/extension-table-row"
import TextAlign from "@tiptap/extension-text-align"
import Underline from "@tiptap/extension-underline"
import {
  AlignCenterIcon,
  AlignLeftIcon,
  AlignRightIcon,
  ArrowLeftIcon,
  BoldIcon,
  Columns3Icon,
  DownloadIcon,
  EraserIcon,
  FileTextIcon,
  ImageIcon,
  IndentDecreaseIcon,
  IndentIncreaseIcon,
  ItalicIcon,
  LinkIcon,
  ListIcon,
  ListOrderedIcon,
  MinusIcon,
  PilcrowIcon,
  Redo2Icon,
  Rows3Icon,
  SaveIcon,
  ScissorsIcon,
  SplitSquareHorizontalIcon,
  StrikethroughIcon,
  TableIcon,
  Undo2Icon,
  UnderlineIcon
} from "@lucide/vue"
import { useApiClient } from "@/application/api"
import { useStore } from "@/application/store"
import { ApiError } from "@/shared/api"

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    pageBreak: {
      setPageBreak: () => ReturnType
    }
  }
}

const INDENT_STEP_PX = 24
const INDENT_STEP_MM = 6.35
const MAX_INDENT_LEVEL = 8
const PAGE_WIDTH_MM = 210
const PAGE_HEIGHT_MM = 297
const PAGE_GAP_MM = 1.6
const MIN_DOCUMENT_CONTENT_SIZE_MM = 10
const RULER_CORNER_SIZE = "1.9rem"

const fontFamilies = [
  { label: "Calibri", value: "Calibri, sans-serif" },
  { label: "Arial", value: "Arial, sans-serif" },
  { label: "Times New Roman", value: "\"Times New Roman\", serif" },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Courier New", value: "\"Courier New\", monospace" }
]

const fontSizes = ["10", "11", "12", "14", "16", "18", "20", "24", "28", "32", "36"]
const lineHeights = [
  { label: "1.0", value: "1" },
  { label: "1.15", value: "1.15" },
  { label: "1.5", value: "1.5" },
  { label: "2.0", value: "2" }
]
const horizontalRulerTicks = Array.from({ length: PAGE_WIDTH_MM + 1 }, (_, millimeter) => ({
  millimeter,
  isCentimeter: millimeter > 0 && millimeter % 10 === 0,
  isHalfCentimeter: millimeter > 0 && millimeter % 5 === 0
}))
const verticalRulerTicks = Array.from({ length: PAGE_HEIGHT_MM + 1 }, (_, millimeter) => ({
  millimeter,
  isCentimeter: millimeter > 0 && millimeter % 10 === 0,
  isHalfCentimeter: millimeter > 0 && millimeter % 5 === 0
}))

interface DocumentPageMargins {
  top: number
  right: number
  bottom: number
  left: number
}

type RulerDragTarget = keyof DocumentPageMargins | "indent"

const defaultPageMargins: DocumentPageMargins = {
  top: 18,
  right: 20,
  bottom: 18,
  left: 20
}

const DocumentWithPageSettings = Document.extend({
  content: "page+",

  addAttributes() {
    return {
      pageMargins: {
        default: defaultPageMargins
      }
    }
  }
})

const DocumentPage = Node.create({
  name: "page",
  group: "block",
  content: "block+",
  defining: true,
  isolating: true,

  parseHTML() {
    return [
      {
        tag: "section[data-document-page]"
      }
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ["section", { ...HTMLAttributes, "data-document-page": "true", class: "document-page-node" }, 0]
  }
})

const ParagraphIndent = Extension.create({
  name: "paragraphIndent",

  addGlobalAttributes() {
    return [
      {
        types: ["paragraph", "heading"],
        attributes: {
          indentLevel: {
            default: 0,
            parseHTML: (element) => {
              const marginLeft = Number.parseFloat(element.style.marginLeft || "0")
              return Number.isFinite(marginLeft) ? Math.min(MAX_INDENT_LEVEL, Math.max(0, Math.round(marginLeft / INDENT_STEP_PX))) : 0
            },
            renderHTML: (attributes) => {
              const indentLevel = Number(attributes.indentLevel || 0)
              if (!indentLevel) return {}

              return {
                style: `margin-left: ${Math.min(MAX_INDENT_LEVEL, Math.max(0, indentLevel)) * INDENT_STEP_PX}px`
              }
            }
          }
        }
      }
    ]
  }
})

const PageBreak = Node.create({
  name: "pageBreak",
  group: "block",
  atom: true,
  selectable: true,

  parseHTML() {
    return [
      {
        tag: "div[data-page-break]"
      }
    ]
  },

  renderHTML() {
    return ["div", { "data-page-break": "true", class: "document-page-break" }]
  },

  addCommands() {
    return {
      setPageBreak: () => ({ commands }) => {
        return commands.insertContent({ type: this.name })
      }
    }
  }
})

const apiClient = useApiClient()
const route = useRoute()
const router = useRouter()
const store = useStore()

const documentUid = computed(() => typeof route.params.documentUid === "string" ? route.params.documentUid : "")
const document = ref<iSharedFiles.StoredDocumentDto | null>(null)
const editor = ref<Editor | null>(null)
const isLoading = ref(true)
const isSaving = ref(false)
const isDirty = ref(false)
const errorMessage = ref("")
const saveStateText = ref("Загрузка")
const autosaveTimer = ref<number | null>(null)
const paginationFrame = ref<number | null>(null)
const isPaginatingDocument = ref(false)
const editorStateVersion = ref(0)
const isImageModalOpen = ref(false)
const imageFormError = ref("")
const imageForm = ref({
  src: "",
  alt: ""
})
const isAttachmentModalOpen = ref(false)
const attachmentFormError = ref("")
const attachmentFile = ref<File | null>(null)
const isFinalizeModalOpen = ref(false)
const isTableModalOpen = ref(false)
const tableFormError = ref("")
const tableForm = ref({
  rows: 4,
  columns: 4,
  withHeaderRow: true
})
const pageMargins = ref<DocumentPageMargins>({ ...defaultPageMargins })
const horizontalRulerElement = ref<HTMLElement | null>(null)
const verticalRulerElement = ref<HTMLElement | null>(null)
const activeRulerTarget = ref<RulerDragTarget | null>(null)
const activePageIndex = ref(0)

const currentUserUid = computed(() => store.state.authorization.user?.uid || null)
const isSuperadministrator = computed(() => store.state.authorization.user?.roles.some((role) => role.name === "superadministrator") || false)
const canManageDocument = computed(() => Boolean(document.value && (document.value.createdByUserUid === currentUserUid.value || isSuperadministrator.value)))
const isReadonly = computed(() => !canManageDocument.value)
const isTableActive = computed(() => {
  editorStateVersion.value
  return Boolean(editor.value?.isActive("table"))
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
const horizontalCentimeterTicks = computed(() => horizontalRulerTicks.filter((tick) => tick.isCentimeter))
const verticalCentimeterTicks = computed(() => verticalRulerTicks.filter((tick) => tick.isCentimeter))

watch(documentUid, () => {
  loadDocument()
}, { immediate: true })

onBeforeUnmount(() => {
  if (autosaveTimer.value !== null) {
    window.clearTimeout(autosaveTimer.value)
  }

  if (paginationFrame.value !== null) {
    window.cancelAnimationFrame(paginationFrame.value)
  }

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
        document: false
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
      Image.configure({
        allowBase64: true
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"]
      }),
      Table.configure({
        resizable: true
      }),
      TableRow,
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
      isDirty.value = true
      saveStateText.value = "Есть изменения"
      scheduleAutosave()
    }
  })
  updateActivePageIndex()
  scheduleDocumentPagination()
}

watch(isReadonly, (readonly) => {
  editor.value?.setEditable(!readonly)
})

function parseDocumentContent(contentJson: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(contentJson)
    if (parsed && typeof parsed === "object") return normalizeDocumentContentShape(parsed as Record<string, unknown>)
  } catch (error) {
    return createDefaultDocumentContent()
  }

  return createDefaultDocumentContent()
}

function createDefaultDocumentContent(): Record<string, unknown> {
  return {
    type: "doc",
    attrs: {
      pageMargins: defaultPageMargins
    },
    content: [
      {
        type: "page",
        content: [{ type: "paragraph" }]
      }
    ]
  }
}

function normalizeDocumentContentShape(content: Record<string, unknown>): Record<string, unknown> {
  if (content.type !== "doc") return createDefaultDocumentContent()

  const contentNodes = Array.isArray(content.content) ? content.content : []
  const hasPageNodes = contentNodes.some((node) => isDocumentPageNode(node))
  if (hasPageNodes) return content

  return {
    ...content,
    content: [
      {
        type: "page",
        content: contentNodes.length ? contentNodes : [{ type: "paragraph" }]
      }
    ]
  }
}

function isDocumentPageNode(value: unknown): boolean {
  return Boolean(value && typeof value === "object" && (value as Record<string, unknown>).type === "page")
}

function getStoredPageMargins(content: Record<string, unknown>): DocumentPageMargins {
  const attrs = content.attrs && typeof content.attrs === "object" ? content.attrs as Record<string, unknown> : {}
  const value = attrs.pageMargins && typeof attrs.pageMargins === "object" ? attrs.pageMargins as Partial<DocumentPageMargins> : {}

  return normalizePageMargins(value)
}

function normalizePageMargins(value: Partial<DocumentPageMargins>): DocumentPageMargins {
  const margins = {
    top: normalizeRawMarginValue(value.top, defaultPageMargins.top),
    right: normalizeRawMarginValue(value.right, defaultPageMargins.right),
    bottom: normalizeRawMarginValue(value.bottom, defaultPageMargins.bottom),
    left: normalizeRawMarginValue(value.left, defaultPageMargins.left)
  }

  return normalizePageMarginPair(margins)
}

function normalizeRawMarginValue(value: unknown, fallback: number): number {
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) return fallback

  return Math.max(0, numericValue)
}

function normalizePageMarginPair(value: DocumentPageMargins): DocumentPageMargins {
  const left = Math.min(value.left, PAGE_WIDTH_MM - MIN_DOCUMENT_CONTENT_SIZE_MM)
  const right = Math.min(value.right, getMarginMaxValue("right", { ...value, left }))
  const top = Math.min(value.top, PAGE_HEIGHT_MM - MIN_DOCUMENT_CONTENT_SIZE_MM)
  const bottom = Math.min(value.bottom, getMarginMaxValue("bottom", { ...value, top }))

  return {
    top,
    right,
    bottom,
    left
  }
}

function normalizeMarginValue(key: keyof DocumentPageMargins, value: unknown, fallback: number): number {
  const numericValue = normalizeRawMarginValue(value, fallback)

  return Math.min(getMarginMaxValue(key), numericValue)
}

function getMarginMaxValue(key: keyof DocumentPageMargins, margins: DocumentPageMargins = pageMargins.value): number {
  if (key === "left") return Math.max(0, PAGE_WIDTH_MM - margins.right - MIN_DOCUMENT_CONTENT_SIZE_MM)
  if (key === "right") return Math.max(0, PAGE_WIDTH_MM - margins.left - MIN_DOCUMENT_CONTENT_SIZE_MM)
  if (key === "top") return Math.max(0, PAGE_HEIGHT_MM - margins.bottom - MIN_DOCUMENT_CONTENT_SIZE_MM)

  return Math.max(0, PAGE_HEIGHT_MM - margins.top - MIN_DOCUMENT_CONTENT_SIZE_MM)
}

function scheduleAutosave(): void {
  if (isReadonly.value) return
  if (autosaveTimer.value !== null) {
    window.clearTimeout(autosaveTimer.value)
  }

  autosaveTimer.value = window.setTimeout(() => {
    autosaveTimer.value = null
    saveDocument()
  }, 5000)
}

function saveDocument(): Promise<void> {
  if (!document.value || !editor.value || isReadonly.value) return Promise.resolve()

  isSaving.value = true
  saveStateText.value = "Сохранение"

  return apiClient.files.updateDocument({
    documentUid: document.value.documentUid,
    title: document.value.title,
    contentJson: JSON.stringify(getDocumentJsonForSave()),
    contentHtml: editor.value.getHTML()
  })
    .then((updatedDocument) => {
      document.value = updatedDocument
      isDirty.value = false
      saveStateText.value = "Сохранено"
    })
    .catch((error) => {
      saveStateText.value = "Ошибка сохранения"
      errorMessage.value = getErrorMessage(error, "Не удалось сохранить документ")
    })
    .finally(() => {
      isSaving.value = false
    })
}

function getDocumentJsonForSave(): Record<string, unknown> {
  const documentJson = editor.value?.getJSON() as Record<string, unknown>
  const attrs = documentJson.attrs && typeof documentJson.attrs === "object" ? documentJson.attrs as Record<string, unknown> : {}

  return {
    ...documentJson,
    attrs: {
      ...attrs,
      pageMargins: pageMargins.value
    }
  }
}

function updateActivePageIndex(): void {
  if (!editor.value) return

  try {
    const cursorRect = editor.value.view.coordsAtPos(editor.value.state.selection.from)
    const pageElements = Array.from(editor.value.view.dom.querySelectorAll<HTMLElement>("[data-document-page]"))
    const pageIndex = pageElements.findIndex((pageElement) => {
      const pageRect = pageElement.getBoundingClientRect()
      return cursorRect.top >= pageRect.top && cursorRect.top <= pageRect.bottom
    })

    activePageIndex.value = pageIndex >= 0 ? pageIndex : 0
  } catch (error) {
    activePageIndex.value = 0
  }
}

function getMillimetersInPixels(value: number): number {
  if (typeof window === "undefined") return 0

  return value * window.devicePixelRatio * (96 / 25.4) / window.devicePixelRatio
}

function scheduleDocumentPagination(): void {
  if (typeof window === "undefined" || paginationFrame.value !== null || isPaginatingDocument.value) return

  nextTick(() => {
    paginationFrame.value = window.requestAnimationFrame(() => {
      paginationFrame.value = null
      normalizeDocumentPages()
    })
  })
}

function normalizeDocumentPages(): void {
  if (!editor.value || isPaginatingDocument.value) return

  const pageElements = Array.from(editor.value.view.dom.querySelectorAll<HTMLElement>("[data-document-page]"))
  const overflowingPageIndex = pageElements.findIndex((pageElement) => pageElement.scrollHeight > pageElement.clientHeight + 2)
  if (overflowingPageIndex < 0) return

  const { state, view } = editor.value
  const pageType = state.schema.nodes.page
  if (!pageType) return

  const pageInfo = getDocumentPageInfo(overflowingPageIndex)
  if (!pageInfo || pageInfo.node.childCount <= 1) return

  const lastChild = pageInfo.node.lastChild
  if (!lastChild) return

  const lastChildStart = pageInfo.pos + 1 + pageInfo.node.content.size - lastChild.nodeSize
  let transaction = state.tr.delete(lastChildStart, lastChildStart + lastChild.nodeSize)
  const nextPageInfo = getDocumentPageInfo(overflowingPageIndex + 1)

  if (nextPageInfo) {
    transaction = transaction.insert(nextPageInfo.pos + 1 - lastChild.nodeSize, lastChild)
  } else {
    transaction = transaction.insert(pageInfo.pos + pageInfo.node.nodeSize - lastChild.nodeSize, pageType.create(null, lastChild))
  }

  isPaginatingDocument.value = true
  view.dispatch(transaction)
  isPaginatingDocument.value = false
  scheduleDocumentPagination()
}

function getDocumentPageInfo(pageIndex: number): { node: ProseMirrorNode, pos: number } | null {
  if (!editor.value) return null

  let currentIndex = 0
  let foundPage: { node: ProseMirrorNode, pos: number } | null = null
  editor.value.state.doc.forEach((node, offset) => {
    if (node.type.name !== "page") return
    if (currentIndex === pageIndex) {
      foundPage = {
        node,
        pos: offset
      }
    }
    currentIndex += 1
  })

  return foundPage
}

function updatePageMargin(key: keyof DocumentPageMargins, event: Event): void {
  const value = normalizeMarginValue(key, (event.target as HTMLInputElement).value, pageMargins.value[key])
  pageMargins.value = {
    ...pageMargins.value,
    [key]: value
  }
  markDocumentLayoutChanged()
}

function startHorizontalRulerDrag(target: RulerDragTarget, event: PointerEvent): void {
  if (isReadonly.value) return

  event.preventDefault()
  activeRulerTarget.value = target
  updateHorizontalRulerValue(target, event.clientX)

  const handlePointerMove = (moveEvent: PointerEvent) => {
    updateHorizontalRulerValue(target, moveEvent.clientX)
  }
  const handlePointerUp = () => {
    activeRulerTarget.value = null
    window.removeEventListener("pointermove", handlePointerMove)
    window.removeEventListener("pointerup", handlePointerUp)
  }

  window.addEventListener("pointermove", handlePointerMove)
  window.addEventListener("pointerup", handlePointerUp)
}

function startVerticalRulerDrag(target: Extract<keyof DocumentPageMargins, "top" | "bottom">, event: PointerEvent): void {
  if (isReadonly.value) return

  event.preventDefault()
  activeRulerTarget.value = target
  updateVerticalRulerValue(target, event.clientY)

  const handlePointerMove = (moveEvent: PointerEvent) => {
    updateVerticalRulerValue(target, moveEvent.clientY)
  }
  const handlePointerUp = () => {
    activeRulerTarget.value = null
    window.removeEventListener("pointermove", handlePointerMove)
    window.removeEventListener("pointerup", handlePointerUp)
  }

  window.addEventListener("pointermove", handlePointerMove)
  window.addEventListener("pointerup", handlePointerUp)
}

function updateHorizontalRulerValue(target: RulerDragTarget, clientX: number): void {
  const rulerElement = horizontalRulerElement.value
  if (!rulerElement) return

  const rect = rulerElement.getBoundingClientRect()
  const pageValue = getValueFromRulerPosition(clientX - rect.left, rect.width, PAGE_WIDTH_MM)

  if (target === "left") {
    pageMargins.value = {
      ...pageMargins.value,
      left: normalizeMarginValue("left", pageValue, pageMargins.value.left)
    }
    markDocumentLayoutChanged()
    return
  }

  if (target === "right") {
    pageMargins.value = {
      ...pageMargins.value,
      right: normalizeMarginValue("right", PAGE_WIDTH_MM - pageValue, pageMargins.value.right)
    }
    markDocumentLayoutChanged()
    return
  }

  if (target === "indent") {
    setCurrentIndent(Math.round((pageValue - pageMargins.value.left) / INDENT_STEP_MM))
  }
}

function updateVerticalRulerValue(target: Extract<keyof DocumentPageMargins, "top" | "bottom">, clientY: number): void {
  const rulerElement = verticalRulerElement.value
  if (!rulerElement) return

  const rect = rulerElement.getBoundingClientRect()
  const pageValue = getValueFromRulerPosition(clientY - rect.top, rect.height, PAGE_HEIGHT_MM)

  pageMargins.value = {
    ...pageMargins.value,
    [target]: normalizeMarginValue(target, target === "top" ? pageValue : PAGE_HEIGHT_MM - pageValue, pageMargins.value[target])
  }
  markDocumentLayoutChanged()
}

function getValueFromRulerPosition(position: number, length: number, maxValue: number): number {
  if (!length) return 0
  return Math.min(maxValue, Math.max(0, (position / length) * maxValue))
}

function getPageHorizontalPercent(value: number): number {
  return Math.min(100, Math.max(0, (value / PAGE_WIDTH_MM) * 100))
}

function getPageVerticalPercent(value: number): number {
  return Math.min(100, Math.max(0, (value / PAGE_HEIGHT_MM) * 100))
}

function resetPageMargins(): void {
  pageMargins.value = { ...defaultPageMargins }
  markDocumentLayoutChanged()
}

function markDocumentLayoutChanged(): void {
  if (isReadonly.value) return

  scheduleDocumentPagination()
  isDirty.value = true
  saveStateText.value = "Есть изменения"
  scheduleAutosave()
}

function renameDocument(): void {
  if (!document.value || isReadonly.value) return

  const title = window.prompt("Название документа", document.value.title)
  if (!title?.trim() || title.trim() === document.value.title) return

  document.value = {
    ...document.value,
    title: title.trim()
  }
  saveDocument()
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
  if (!editor.value || isReadonly.value) return

  imageForm.value = {
    src: "",
    alt: ""
  }
  imageFormError.value = ""
  isImageModalOpen.value = true
}

function closeImageModal(): void {
  isImageModalOpen.value = false
  imageFormError.value = ""
}

function insertImage(): void {
  if (!editor.value || isReadonly.value) return

  const src = imageForm.value.src.trim()
  if (!src) {
    imageFormError.value = "Укажите ссылку на изображение"
    return
  }

  editor.value.chain().focus().setImage({
    src,
    alt: imageForm.value.alt.trim() || undefined
  }).run()
  closeImageModal()
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

  const href = window.prompt("Ссылка на файл, PDF или страницу")
  if (!href?.trim()) return

  const selectedText = editor.value.state.doc.textBetween(editor.value.state.selection.from, editor.value.state.selection.to)
  if (!selectedText) {
    editor.value.chain().focus().insertContent(`<a href="${escapeAttribute(href.trim())}">${escapeHtml(href.trim())}</a>`).run()
    return
  }

  editor.value.chain().focus().setLink({ href: href.trim() }).run()
}

function setBlockStyle(event: Event): void {
  if (!editor.value || isReadonly.value) return

  const value = (event.target as HTMLSelectElement).value

  if (value === "paragraph") {
    editor.value.chain().focus().setParagraph().run()
    return
  }

  const level = Number(value.replace("heading-", ""))
  if ([1, 2, 3].includes(level)) {
    editor.value.chain().focus().toggleHeading({ level: level as 1 | 2 | 3 }).run()
  }
}

function setFontFamily(event: Event): void {
  if (!editor.value || isReadonly.value) return

  const value = (event.target as HTMLSelectElement).value
  const chain = editor.value.chain().focus()

  if (value) {
    chain.setFontFamily(value).run()
    return
  }

  chain.unsetFontFamily().run()
}

function setFontSize(event: Event): void {
  if (!editor.value || isReadonly.value) return

  const value = (event.target as HTMLSelectElement).value
  const chain = editor.value.chain().focus()

  if (value) {
    chain.setFontSize(`${value}px`).run()
    return
  }

  chain.unsetFontSize().run()
}

function setLineHeight(event: Event): void {
  if (!editor.value || isReadonly.value) return

  const value = (event.target as HTMLSelectElement).value
  const chain = editor.value.chain().focus()

  if (value) {
    chain.setLineHeight(value).run()
    return
  }

  chain.unsetLineHeight().run()
}

function setTextColor(event: Event): void {
  if (!editor.value || isReadonly.value) return
  editor.value.chain().focus().setColor((event.target as HTMLInputElement).value).run()
}

function setBackgroundColor(event: Event): void {
  if (!editor.value || isReadonly.value) return
  editor.value.chain().focus().setBackgroundColor((event.target as HTMLInputElement).value).run()
}

function increaseIndent(): void {
  setCurrentIndent(getCurrentIndentLevel() + 1)
}

function decreaseIndent(): void {
  setCurrentIndent(getCurrentIndentLevel() - 1)
}

function getCurrentIndentLevel(): number {
  if (!editor.value) return 0

  const paragraphIndent = Number(editor.value.getAttributes("paragraph").indentLevel || 0)
  const headingIndent = Number(editor.value.getAttributes("heading").indentLevel || 0)

  return Math.max(paragraphIndent, headingIndent, 0)
}

function setCurrentIndent(indentLevel: number): void {
  if (!editor.value || isReadonly.value) return

  const normalizedIndentLevel = Math.min(MAX_INDENT_LEVEL, Math.max(0, indentLevel))

  editor.value
    .chain()
    .focus()
    .updateAttributes("paragraph", { indentLevel: normalizedIndentLevel })
    .updateAttributes("heading", { indentLevel: normalizedIndentLevel })
    .run()
}

function setSelectedTextIndent(event: Event): void {
  setCurrentIndent(Number((event.target as HTMLInputElement).value))
}

function clearFormatting(): void {
  if (!editor.value || isReadonly.value) return

  editor.value
    .chain()
    .focus()
    .unsetAllMarks()
    .unsetFontFamily()
    .unsetFontSize()
    .unsetColor()
    .unsetBackgroundColor()
    .clearNodes()
    .setParagraph()
    .run()
}

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
    <header class="border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex min-w-0 items-center gap-3">
          <button
            class="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            type="button"
            aria-label="Назад"
            @click="goBack"
          >
            <ArrowLeftIcon class="h-4 w-4" aria-hidden="true" />
          </button>
          <div class="min-w-0">
            <button
              class="block max-w-[42rem] truncate text-left text-lg font-semibold text-slate-950 hover:text-blue-700 disabled:hover:text-slate-950 dark:text-slate-50 dark:hover:text-blue-200 dark:disabled:hover:text-slate-50"
              type="button"
              :disabled="isReadonly"
              @click="renameDocument"
            >
              {{ document?.title || "Документ" }}
            </button>
            <div class="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span>{{ saveStateText }}</span>
              <span v-if="isDirty">Автосохранение включено</span>
              <span v-if="document?.status === 'final'">Только просмотр</span>
            </div>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <button
            class="inline-flex min-h-9 items-center justify-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            type="button"
            :disabled="isSaving || isReadonly"
            @click="saveDocument"
          >
            <SaveIcon class="h-4 w-4" aria-hidden="true" />
            Сохранить
          </button>
          <button
            class="inline-flex min-h-9 items-center justify-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            type="button"
            @click="downloadDocument"
          >
            <DownloadIcon class="h-4 w-4" aria-hidden="true" />
            DOCX
          </button>
          <button
            v-if="document?.status === 'draft' && canManageDocument"
            class="inline-flex min-h-9 items-center justify-center gap-2 rounded-md bg-blue-600 px-3 text-sm font-medium text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-400"
            type="button"
            :disabled="isSaving"
            @click="openFinalizeModal"
          >
            <FileTextIcon class="h-4 w-4" aria-hidden="true" />
            Завершить
          </button>
        </div>
      </div>

      <div v-if="!isReadonly" class="mt-3 flex flex-wrap items-center gap-2">
        <div class="editor-toolbar-group" data-label="История">
          <button class="editor-button" type="button" aria-label="Отменить" title="Отменить" @click="editor?.chain().focus().undo().run()">
            <Undo2Icon class="h-4 w-4" aria-hidden="true" />
          </button>
          <button class="editor-button" type="button" aria-label="Повторить" title="Повторить" @click="editor?.chain().focus().redo().run()">
            <Redo2Icon class="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div class="editor-toolbar-group" data-label="Шрифт">
          <select class="editor-select w-36" aria-label="Стиль текста" @change="setBlockStyle">
            <option value="paragraph">Обычный текст</option>
            <option value="heading-1">Заголовок 1</option>
            <option value="heading-2">Заголовок 2</option>
            <option value="heading-3">Заголовок 3</option>
          </select>
          <select class="editor-select w-40" aria-label="Шрифт" @change="setFontFamily">
            <option value="">Шрифт</option>
            <option v-for="font in fontFamilies" :key="font.value" :value="font.value">
              {{ font.label }}
            </option>
          </select>
          <select class="editor-select w-24" aria-label="Размер шрифта" @change="setFontSize">
            <option value="">Размер</option>
            <option v-for="fontSize in fontSizes" :key="fontSize" :value="fontSize">
              {{ fontSize }}
            </option>
          </select>
          <select class="editor-select w-24" aria-label="Межстрочный интервал" @change="setLineHeight">
            <option value="">Интервал</option>
            <option v-for="lineHeight in lineHeights" :key="lineHeight.value" :value="lineHeight.value">
              {{ lineHeight.label }}
            </option>
          </select>
        </div>

        <div class="editor-toolbar-group" data-label="Текст">
          <button class="editor-button" type="button" aria-label="Жирный" title="Жирный" @click="editor?.chain().focus().toggleBold().run()">
          <BoldIcon class="h-4 w-4" aria-hidden="true" />
          </button>
          <button class="editor-button" type="button" aria-label="Курсив" title="Курсив" @click="editor?.chain().focus().toggleItalic().run()">
            <ItalicIcon class="h-4 w-4" aria-hidden="true" />
          </button>
          <button class="editor-button" type="button" aria-label="Подчеркнутый" title="Подчеркнутый" @click="editor?.chain().focus().toggleUnderline().run()">
            <UnderlineIcon class="h-4 w-4" aria-hidden="true" />
          </button>
          <button class="editor-button" type="button" aria-label="Зачеркнутый" title="Зачеркнутый" @click="editor?.chain().focus().toggleStrike().run()">
            <StrikethroughIcon class="h-4 w-4" aria-hidden="true" />
          </button>
          <label class="editor-color" title="Цвет текста">
            <span class="sr-only">Цвет текста</span>
            <input type="color" value="#0f172a" @input="setTextColor">
          </label>
          <label class="editor-color" title="Цвет фона текста">
            <span class="sr-only">Цвет фона текста</span>
            <input type="color" value="#fff7cc" @input="setBackgroundColor">
          </label>
          <button class="editor-button" type="button" aria-label="Очистить форматирование" title="Очистить форматирование" @click="clearFormatting">
            <EraserIcon class="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div class="editor-toolbar-group" data-label="Абзац">
          <button class="editor-button" type="button" aria-label="Маркированный список" title="Маркированный список" @click="editor?.chain().focus().toggleBulletList().run()">
            <ListIcon class="h-4 w-4" aria-hidden="true" />
          </button>
          <button class="editor-button" type="button" aria-label="Нумерованный список" title="Нумерованный список" @click="editor?.chain().focus().toggleOrderedList().run()">
            <ListOrderedIcon class="h-4 w-4" aria-hidden="true" />
          </button>
          <button class="editor-button" type="button" aria-label="Уменьшить отступ" title="Уменьшить отступ" @click="decreaseIndent">
            <IndentDecreaseIcon class="h-4 w-4" aria-hidden="true" />
          </button>
          <button class="editor-button" type="button" aria-label="Увеличить отступ" title="Увеличить отступ" @click="increaseIndent">
            <IndentIncreaseIcon class="h-4 w-4" aria-hidden="true" />
          </button>
          <button class="editor-button" type="button" aria-label="Абзац" title="Абзац" @click="editor?.chain().focus().setParagraph().run()">
            <PilcrowIcon class="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div class="editor-toolbar-group" data-label="Блоки">
          <button class="editor-button" type="button" aria-label="По левому краю" title="По левому краю" @click="editor?.chain().focus().setTextAlign('left').run()">
            <AlignLeftIcon class="h-4 w-4" aria-hidden="true" />
          </button>
          <button class="editor-button" type="button" aria-label="По центру" title="По центру" @click="editor?.chain().focus().setTextAlign('center').run()">
            <AlignCenterIcon class="h-4 w-4" aria-hidden="true" />
          </button>
          <button class="editor-button" type="button" aria-label="По правому краю" title="По правому краю" @click="editor?.chain().focus().setTextAlign('right').run()">
            <AlignRightIcon class="h-4 w-4" aria-hidden="true" />
          </button>
          <button class="editor-button" type="button" aria-label="Горизонтальная линия" title="Горизонтальная линия" @click="editor?.chain().focus().setHorizontalRule().run()">
            <MinusIcon class="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div class="editor-toolbar-group editor-page-settings" data-label="Лист">
          <label title="Верхнее поле">
            <span>Верх</span>
            <input :value="pageMargins.top" min="0" :max="getMarginMaxValue('top')" step="1" type="number" @input="updatePageMargin('top', $event)">
          </label>
          <label title="Правое поле">
            <span>Право</span>
            <input :value="pageMargins.right" min="0" :max="getMarginMaxValue('right')" step="1" type="number" @input="updatePageMargin('right', $event)">
          </label>
          <label title="Нижнее поле">
            <span>Низ</span>
            <input :value="pageMargins.bottom" min="0" :max="getMarginMaxValue('bottom')" step="1" type="number" @input="updatePageMargin('bottom', $event)">
          </label>
          <label title="Левое поле">
            <span>Лево</span>
            <input :value="pageMargins.left" min="0" :max="getMarginMaxValue('left')" step="1" type="number" @input="updatePageMargin('left', $event)">
          </label>
          <label title="Отступ выбранного абзаца">
            <span>Абзац</span>
            <input :value="currentIndentLevel" min="0" :max="MAX_INDENT_LEVEL" step="1" type="number" @input="setSelectedTextIndent">
          </label>
          <button class="editor-text-button" type="button" @click="resetPageMargins">A4</button>
        </div>

        <div class="editor-toolbar-group" data-label="Таблица">
          <button class="editor-button" type="button" aria-label="Таблица" title="Вставить таблицу" @click="openTableModal">
            <TableIcon class="h-4 w-4" aria-hidden="true" />
          </button>
          <button class="editor-button" type="button" :disabled="!isTableActive" aria-label="Колонка слева" title="Колонка слева" @click="addTableColumnBefore">
            <Columns3Icon class="h-4 w-4" aria-hidden="true" />
          </button>
          <button class="editor-button" type="button" :disabled="!isTableActive" aria-label="Колонка справа" title="Колонка справа" @click="addTableColumnAfter">
            <Columns3Icon class="h-4 w-4 rotate-180" aria-hidden="true" />
          </button>
          <button class="editor-button" type="button" :disabled="!isTableActive" aria-label="Удалить колонку" title="Удалить колонку" @click="deleteTableColumn">
            <ScissorsIcon class="h-4 w-4" aria-hidden="true" />
          </button>
          <button class="editor-button" type="button" :disabled="!isTableActive" aria-label="Строка выше" title="Строка выше" @click="addTableRowBefore">
            <Rows3Icon class="h-4 w-4" aria-hidden="true" />
          </button>
          <button class="editor-button" type="button" :disabled="!isTableActive" aria-label="Строка ниже" title="Строка ниже" @click="addTableRowAfter">
            <Rows3Icon class="h-4 w-4 rotate-180" aria-hidden="true" />
          </button>
          <button class="editor-button" type="button" :disabled="!isTableActive" aria-label="Удалить строку" title="Удалить строку" @click="deleteTableRow">
            <ScissorsIcon class="h-4 w-4 rotate-90" aria-hidden="true" />
          </button>
          <button class="editor-button" type="button" :disabled="!isTableActive" aria-label="Объединить ячейки" title="Объединить ячейки" @click="mergeTableCells">
            <SplitSquareHorizontalIcon class="h-4 w-4 rotate-90" aria-hidden="true" />
          </button>
          <button class="editor-button" type="button" :disabled="!isTableActive" aria-label="Разделить ячейку" title="Разделить ячейку" @click="splitTableCell">
            <SplitSquareHorizontalIcon class="h-4 w-4" aria-hidden="true" />
          </button>
          <button class="editor-text-button" type="button" :disabled="!isTableActive" title="Строка заголовка" @click="toggleTableHeaderRow">
            H-строка
          </button>
          <button class="editor-text-button" type="button" :disabled="!isTableActive" title="Колонка заголовка" @click="toggleTableHeaderColumn">
            H-колонка
          </button>
          <button class="editor-text-button text-red-600 dark:text-red-300" type="button" :disabled="!isTableActive" title="Удалить таблицу" @click="deleteTable">
            Удалить
          </button>
        </div>

        <div class="editor-toolbar-group" data-label="Вставка">
          <button class="editor-button" type="button" aria-label="Изображение по ссылке" title="Изображение по ссылке" @click="openImageModal">
            <ImageIcon class="h-4 w-4" aria-hidden="true" />
          </button>
          <button class="editor-button" type="button" aria-label="Загрузить изображение или PDF" title="Загрузить изображение или PDF" @click="openAttachmentModal">
            <FileTextIcon class="h-4 w-4" aria-hidden="true" />
          </button>
          <button class="editor-button" type="button" aria-label="Ссылка" title="Ссылка" @click="insertLink">
            <LinkIcon class="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

    </header>

    <main class="min-h-0 overflow-auto bg-slate-100 px-3 pb-3 pt-0 dark:bg-slate-950">
      <div v-if="errorMessage" class="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
        {{ errorMessage }}
      </div>

      <div v-if="isLoading" class="rounded-md border border-slate-200 bg-white px-4 py-6 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
        Загрузка документа
      </div>

      <div v-else class="document-workspace mx-auto w-fit">
        <div class="document-ruler-frame">
          <div class="document-ruler-corner" aria-hidden="true">L</div>

          <div
            ref="horizontalRulerElement"
            class="document-horizontal-ruler"
            :style="horizontalRulerStyle"
            aria-label="Горизонтальная линейка документа"
          >
            <span class="ruler-page-area" aria-hidden="true" />
            <span
              v-for="tick in horizontalRulerTicks"
              :key="`horizontal-millimeter-${tick.millimeter}`"
              class="ruler-tick ruler-tick-horizontal"
              :class="{ 'ruler-tick-centimeter': tick.isCentimeter, 'ruler-tick-half': tick.isHalfCentimeter }"
              :style="{ left: `${(tick.millimeter / PAGE_WIDTH_MM) * 100}%` }"
              aria-hidden="true"
            />
            <span
              v-for="tick in horizontalCentimeterTicks"
              :key="`horizontal-centimeter-label-${tick.millimeter}`"
              class="ruler-centimeter-label ruler-centimeter-label-horizontal"
              :style="{ left: `${(tick.millimeter / PAGE_WIDTH_MM) * 100}%` }"
              aria-hidden="true"
            >
              {{ tick.millimeter / 10 }}
            </span>
            <button
              v-if="!isReadonly"
              class="ruler-marker ruler-marker-left"
              type="button"
              title="Левое поле"
              aria-label="Левое поле"
              @pointerdown="startHorizontalRulerDrag('left', $event)"
            />
            <button
              v-if="!isReadonly"
              class="ruler-marker ruler-marker-indent"
              type="button"
              title="Отступ выбранного абзаца"
              aria-label="Отступ выбранного абзаца"
              @pointerdown="startHorizontalRulerDrag('indent', $event)"
            />
            <button
              v-if="!isReadonly"
              class="ruler-marker ruler-marker-right"
              type="button"
              title="Правое поле"
              aria-label="Правое поле"
              @pointerdown="startHorizontalRulerDrag('right', $event)"
            />
          </div>

          <div
            ref="verticalRulerElement"
            class="document-vertical-ruler"
            :style="verticalRulerStyle"
            aria-label="Вертикальная линейка документа"
          >
            <span class="ruler-page-area" aria-hidden="true" />
            <span
              v-for="tick in verticalRulerTicks"
              :key="`vertical-millimeter-${tick.millimeter}`"
              class="ruler-tick ruler-tick-vertical"
              :class="{ 'ruler-tick-centimeter': tick.isCentimeter, 'ruler-tick-half': tick.isHalfCentimeter }"
              :style="{ top: `${(tick.millimeter / PAGE_HEIGHT_MM) * 100}%` }"
              aria-hidden="true"
            />
            <span
              v-for="tick in verticalCentimeterTicks"
              :key="`vertical-centimeter-label-${tick.millimeter}`"
              class="ruler-centimeter-label ruler-centimeter-label-vertical"
              :style="{ top: `${(tick.millimeter / PAGE_HEIGHT_MM) * 100}%` }"
              aria-hidden="true"
            >
              {{ tick.millimeter / 10 }}
            </span>
            <button
              v-if="!isReadonly"
              class="ruler-marker ruler-marker-top"
              type="button"
              title="Верхнее поле"
              aria-label="Верхнее поле"
              @pointerdown="startVerticalRulerDrag('top', $event)"
            />
            <button
              v-if="!isReadonly"
              class="ruler-marker ruler-marker-bottom"
              type="button"
              title="Нижнее поле"
              aria-label="Нижнее поле"
              @pointerdown="startVerticalRulerDrag('bottom', $event)"
            />
          </div>

          <div class="document-page-slot" :style="pageGuideStyle">
            <span
              v-if="activeVerticalGuideClass"
              class="document-guide document-guide-vertical"
              :class="activeVerticalGuideClass"
              aria-hidden="true"
            />
            <span
              v-if="activeHorizontalGuideClass"
              class="document-guide document-guide-horizontal"
              :class="activeHorizontalGuideClass"
              aria-hidden="true"
            />
            <EditorContent
              v-if="editor"
              class="document-editor-content"
              :editor="editor"
            />
          </div>
        </div>
      </div>
    </main>

    <teleport to="body">
      <div
        v-if="isImageModalOpen"
        class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="image-modal-title"
      >
        <form class="w-full max-w-lg rounded-md bg-white p-5 shadow-xl dark:bg-slate-900" @submit.prevent="insertImage">
          <h2 id="image-modal-title" class="text-lg font-semibold text-slate-950 dark:text-slate-50">Добавление изображения</h2>
          <div class="mt-4 grid gap-4">
            <label class="grid gap-1 text-sm font-medium text-slate-700 dark:text-slate-200">
              Ссылка на изображение
              <input
                v-model="imageForm.src"
                class="min-h-10 rounded-md border border-slate-300 px-3 text-sm text-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50"
                type="url"
                placeholder="https://example.com/image.jpg"
                required
                autofocus
              >
            </label>
            <label class="grid gap-1 text-sm font-medium text-slate-700 dark:text-slate-200">
              Описание
              <input
                v-model="imageForm.alt"
                class="min-h-10 rounded-md border border-slate-300 px-3 text-sm text-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50"
                type="text"
                maxlength="180"
              >
            </label>
          </div>
          <div v-if="imageFormError" class="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
            {{ imageFormError }}
          </div>
          <div class="mt-5 flex justify-end gap-2">
            <button class="modal-secondary-button" type="button" @click="closeImageModal">Отмена</button>
            <button class="modal-primary-button" type="submit">Добавить</button>
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
        <form class="w-full max-w-lg rounded-md bg-white p-5 shadow-xl dark:bg-slate-900" @submit.prevent="insertAttachment">
          <h2 id="attachment-modal-title" class="text-lg font-semibold text-slate-950 dark:text-slate-50">Добавление файла</h2>
          <label class="mt-4 grid gap-1 text-sm font-medium text-slate-700 dark:text-slate-200">
            Изображение или PDF
            <input
              class="min-h-10 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50"
              type="file"
              accept="image/*,application/pdf"
              @change="handleAttachmentSelected"
            >
          </label>
          <div v-if="attachmentFormError" class="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
            {{ attachmentFormError }}
          </div>
          <div class="mt-5 flex justify-end gap-2">
            <button class="modal-secondary-button" type="button" :disabled="isSaving" @click="closeAttachmentModal">Отмена</button>
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
        <form class="w-full max-w-md rounded-md bg-white p-5 shadow-xl dark:bg-slate-900" @submit.prevent="insertTable">
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
            <button class="modal-secondary-button" type="button" @click="closeTableModal">Отмена</button>
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
        <form class="w-full max-w-md rounded-md bg-white p-5 shadow-xl dark:bg-slate-900" @submit.prevent="finalizeDocument">
          <h2 id="finalize-modal-title" class="text-lg font-semibold text-slate-950 dark:text-slate-50">Завершение документа</h2>
          <p class="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
            Документ будет отмечен как завершенный. Редактирование останется доступным владельцу и суперадминистратору.
          </p>
          <div class="mt-5 flex justify-end gap-2">
            <button class="modal-secondary-button" type="button" :disabled="isSaving" @click="closeFinalizeModal">Отмена</button>
            <button class="modal-primary-button" type="submit" :disabled="isSaving">Завершить</button>
          </div>
        </form>
      </div>
    </teleport>
  </section>
</template>

<style scoped>
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

.editor-page-settings {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 0.25rem;
}

.editor-page-settings label {
  display: inline-flex;
  min-height: 2.25rem;
  min-width: 4.75rem;
  align-items: center;
  justify-content: space-between;
  gap: 0.35rem;
  border-radius: 0.375rem;
  border: 1px solid rgb(148 163 184);
  background: rgb(255 255 255);
  padding: 0 0.35rem 0 0.45rem;
  transition: background-color 0.15s ease, border-color 0.15s ease;
}

.editor-page-settings span {
  color: rgb(51 65 85);
  font-size: 0.75rem;
  font-weight: 500;
  line-height: 1;
}

.editor-page-settings input {
  min-height: 1.65rem;
  width: 2.85rem;
  border: 0;
  border-radius: 0.25rem;
  background: rgb(241 245 249);
  padding: 0 0.2rem;
  color: rgb(30 41 59);
  font-size: 0.75rem;
  font-weight: 600;
  text-align: center;
}

.editor-page-settings label:focus-within,
.editor-page-settings label:hover {
  border-color: rgb(59 130 246);
  background: rgb(239 246 255);
}

.editor-page-settings input:focus {
  outline: 2px solid rgb(147 197 253);
  outline-offset: 1px;
}

.document-editor-content {
  position: relative;
  z-index: 2;
  width: 210mm;
  box-sizing: border-box;
  background: transparent;
}

.document-editor-content :deep(.ProseMirror) {
  min-height: v-bind("documentEditorStyle.minHeight");
  outline: none;
  color: rgb(15 23 42);
  line-height: 1.65;
}

.document-editor-content :deep(.document-page-node) {
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

.document-editor-content :deep(.document-page-node:last-child) {
  margin-bottom: 0;
}

.document-editor-content :deep(.document-page-node > :first-child) {
  margin-top: 0;
}

.document-editor-content :deep(.document-page-node > :last-child) {
  margin-bottom: 0;
}

.document-editor-content :deep(.ProseMirror p) {
  margin: 0.55rem 0;
}

.document-editor-content :deep(.ProseMirror h1) {
  margin: 1.25rem 0 0.75rem;
  font-size: 1.875rem;
  font-weight: 700;
}

.document-editor-content :deep(.ProseMirror h2) {
  margin: 1rem 0 0.625rem;
  font-size: 1.5rem;
  font-weight: 700;
}

.document-editor-content :deep(.ProseMirror h3) {
  margin: 0.875rem 0 0.5rem;
  font-size: 1.25rem;
  font-weight: 700;
}

.document-editor-content :deep(.ProseMirror ul),
.document-editor-content :deep(.ProseMirror ol) {
  margin: 0.75rem 0;
  padding-left: 1.5rem;
}

.document-editor-content :deep(.ProseMirror ul) {
  list-style-type: disc;
}

.document-editor-content :deep(.ProseMirror ol) {
  list-style-type: decimal;
}

.document-editor-content :deep(.ProseMirror li) {
  display: list-item;
  margin: 0.35rem 0;
  padding-left: 0.25rem;
}

.document-editor-content :deep(.ProseMirror li p) {
  margin: 0.2rem 0;
}

.document-editor-content :deep(.ProseMirror table) {
  margin: 1rem 0;
  width: 100%;
  border-collapse: collapse;
  break-inside: avoid;
  page-break-inside: avoid;
}

.document-editor-content :deep(.ProseMirror td),
.document-editor-content :deep(.ProseMirror th) {
  min-width: 4rem;
  border: 1px solid rgb(203 213 225);
  padding: 0.5rem;
  vertical-align: top;
}

.document-editor-content :deep(.ProseMirror th) {
  background: rgb(241 245 249);
  font-weight: 700;
}

.document-editor-content :deep(.ProseMirror img) {
  display: block;
  max-width: 100%;
  max-height: calc(297mm - var(--page-padding-top) - var(--page-padding-bottom));
  border-radius: 0.375rem;
  break-inside: avoid;
  object-fit: contain;
  page-break-inside: avoid;
}

.document-editor-content :deep(.ProseMirror a) {
  color: rgb(37 99 235);
  text-decoration: underline;
}

.document-editor-content :deep(.ProseMirror hr) {
  margin: 1rem 0;
  border: 0;
  border-top: 1px solid rgb(203 213 225);
}

.document-editor-content :deep(.document-page-break) {
  position: relative;
  height: 18mm;
  margin: 10mm -20mm;
  border-top: 2px dashed rgb(37 99 235);
  border-bottom: 2px dashed rgb(37 99 235);
  background: rgb(239 246 255);
  break-after: page;
  page-break-after: always;
}

.document-editor-content :deep(.document-page-break::before) {
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

:global(.dark) .editor-button {
  border-color: rgb(71 85 105);
  background: rgb(15 23 42);
  color: rgb(226 232 240);
}

:global(.dark) .editor-button:hover {
  border-color: rgb(96 165 250);
  background: rgb(30 41 59);
  color: rgb(191 219 254);
}

:global(.dark) .editor-toolbar-group {
  border-color: rgb(51 65 85);
  background: rgb(15 23 42);
}

:global(.dark) .editor-toolbar-group::before {
  color: rgb(148 163 184);
}

:global(.dark) .editor-select,
:global(.dark) .editor-text-button,
:global(.dark) .editor-color {
  border-color: rgb(51 65 85);
  background: rgb(15 23 42);
  color: rgb(226 232 240);
}

:global(.dark) .modal-secondary-button {
  border-color: rgb(51 65 85);
  color: rgb(226 232 240);
}

:global(.dark) .modal-secondary-button:hover {
  background: rgb(30 41 59);
}

:global(.dark) .document-ruler-corner,
:global(.dark) .document-horizontal-ruler,
:global(.dark) .document-vertical-ruler {
  border-color: rgb(71 85 105);
  background-color: rgb(15 23 42);
  color: rgb(226 232 240);
}

:global(.dark) .ruler-tick {
  background: rgb(100 116 139);
}

:global(.dark) .ruler-tick-centimeter {
  background: rgb(203 213 225);
}

:global(.dark) .ruler-centimeter-label {
  color: rgb(248 250 252);
}

:global(.dark) .document-horizontal-ruler::before,
:global(.dark) .document-horizontal-ruler::after,
:global(.dark) .document-vertical-ruler::before,
:global(.dark) .document-vertical-ruler::after {
  background: rgb(30 58 138);
  color: rgb(219 234 254);
}

:global(.dark) .document-horizontal-ruler .ruler-page-area::after {
  background: rgb(20 83 45);
  color: rgb(220 252 231);
}

:global(.dark) .editor-page-settings {
  color: rgb(203 213 225);
}

:global(.dark) .editor-page-settings label {
  border-color: rgb(71 85 105);
  background: rgb(15 23 42);
}

:global(.dark) .editor-page-settings label:focus-within,
:global(.dark) .editor-page-settings label:hover {
  border-color: rgb(96 165 250);
  background: rgb(30 41 59);
}

:global(.dark) .editor-page-settings span {
  color: rgb(226 232 240);
}

:global(.dark) .editor-page-settings input {
  background: rgb(30 41 59);
  color: rgb(248 250 252);
}

:global(.dark) .document-editor-content :deep(.ProseMirror) {
  color: rgb(248 250 252);
}

:global(.dark) .document-editor-content {
  background: transparent;
}

:global(.dark) .document-editor-content :deep(.document-page-node) {
  border-color: rgb(51 65 85);
  background: rgb(15 23 42);
  box-shadow: 0 1px 2px rgb(0 0 0 / 0.26), 0 12px 28px rgb(0 0 0 / 0.28);
}

:global(.dark) .document-editor-content :deep(.document-page-break) {
  background: rgb(23 37 84);
  border-color: rgb(96 165 250);
}

:global(.dark) .document-editor-content :deep(.document-page-break::before) {
  background: rgb(15 23 42);
  color: rgb(191 219 254);
}

:global(.dark) .document-editor-content :deep(.ProseMirror th) {
  background: rgb(30 41 59);
}

:global(.dark) .document-editor-content :deep(.ProseMirror td),
:global(.dark) .document-editor-content :deep(.ProseMirror th) {
  border-color: rgb(71 85 105);
}
</style>

