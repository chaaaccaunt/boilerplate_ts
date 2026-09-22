import { Extension, Node } from "@tiptap/core"
import Document from "@tiptap/extension-document"
import TableRow from "@tiptap/extension-table-row"
import { Plugin } from "@tiptap/pm/state"
import type { Transaction } from "@tiptap/pm/state"
import { TableMap, columnResizingPluginKey } from "@tiptap/pm/tables"
import type { EditorView } from "@tiptap/pm/view"

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    pageBreak: {
      setPageBreak: () => ReturnType
    }
  }
}

export const INDENT_STEP_PX = 24
export const INDENT_STEP_MM = 6.35
export const MAX_INDENT_LEVEL = 8
export const PAGE_WIDTH_MM = 210
export const PAGE_HEIGHT_MM = 297
export const PAGE_GAP_MM = 1.6
export const MIN_DOCUMENT_CONTENT_SIZE_MM = 10
export const RULER_CORNER_SIZE = "1.9rem"
const MIN_TABLE_ROW_HEIGHT_PX = 32
const MIN_TABLE_COLUMN_WIDTH_PX = 25
const TABLE_ROW_RESIZE_AREA_PX = 6

export const fontFamilies = [
  { label: "Calibri", value: "Calibri, sans-serif" },
  { label: "Arial", value: "Arial, sans-serif" },
  { label: "Times New Roman", value: "\"Times New Roman\", serif" },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Courier New", value: "\"Courier New\", monospace" }
]

export const fontSizes = ["10", "11", "12", "14", "16", "18", "20", "24", "28", "32", "36"]
export const lineHeights = [
  { label: "1.0", value: "1" },
  { label: "1.15", value: "1.15" },
  { label: "1.5", value: "1.5" },
  { label: "2.0", value: "2" }
]
export const horizontalRulerTicks = Array.from({ length: PAGE_WIDTH_MM + 1 }, (_, millimeter) => ({
  millimeter,
  isCentimeter: millimeter > 0 && millimeter % 10 === 0,
  isHalfCentimeter: millimeter > 0 && millimeter % 5 === 0
}))
export const verticalRulerTicks = Array.from({ length: PAGE_HEIGHT_MM + 1 }, (_, millimeter) => ({
  millimeter,
  isCentimeter: millimeter > 0 && millimeter % 10 === 0,
  isHalfCentimeter: millimeter > 0 && millimeter % 5 === 0
}))

export interface DocumentPageMargins {
  top: number
  right: number
  bottom: number
  left: number
}

export type RulerDragTarget = keyof DocumentPageMargins | "indent"

export const defaultPageMargins: DocumentPageMargins = {
  top: 18,
  right: 20,
  bottom: 18,
  left: 20
}

export const DocumentWithPageSettings = Document.extend({
  content: "page+",
  addAttributes: () => ({ pageMargins: { default: defaultPageMargins } })
})

export const DocumentPage = Node.create({
  name: "page",
  group: "block",
  content: "block+",
  defining: true,
  isolating: true,
  parseHTML: () => [{ tag: "section[data-document-page]" }],
  renderHTML: ({ HTMLAttributes }) => ["section", { ...HTMLAttributes, "data-document-page": "true", class: "document-page-node" }, 0]
})

export const ParagraphIndent = Extension.create({
  name: "paragraphIndent",
  addGlobalAttributes: () => [{
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
          return { style: `margin-left: ${Math.min(MAX_INDENT_LEVEL, Math.max(0, indentLevel)) * INDENT_STEP_PX}px` }
        }
      }
    }
  }]
})

export const ResizableTableRow = TableRow.extend({
  priority: 1000,

  addAttributes() {
    return {
      ...this.parent?.(),
      rowHeight: {
        default: null,
        parseHTML: (element) => {
          const height = Number.parseFloat(element.style.height || "")
          return Number.isFinite(height) && height >= MIN_TABLE_ROW_HEIGHT_PX ? height : null
        },
        renderHTML: (attributes) => {
          const height = Number(attributes.rowHeight)
          return Number.isFinite(height) && height >= MIN_TABLE_ROW_HEIGHT_PX
            ? { style: `height: ${Math.round(height)}px` }
            : {}
        }
      }
    }
  },

  addProseMirrorPlugins() {
    let stopDragging: (() => void) | null = null

    return [new Plugin({
      props: {
        handleDOMEvents: {
          mousemove: (view, event) => {
            if (stopDragging) return false
            if (event.buttons !== 0) {
              view.dom.classList.remove("resize-cursor", "row-resize-cursor")
              return false
            }

            const columnTarget = getTableColumnResizeTarget(view, event)
            if (columnTarget) {
              view.dom.classList.add("resize-cursor")
              setNativeColumnResizeHandle(view, columnTarget.leftHandlePosition)
              return true
            }

            view.dom.classList.toggle("row-resize-cursor", Boolean(getTableRowResizeTarget(view, event)))
            return false
          },
          mouseleave: (view) => {
            if (!stopDragging) {
              view.dom.classList.remove("resize-cursor", "row-resize-cursor")
            }
            return false
          },
          mousedown: (view, event) => {
            if (event.button !== 0 || !view.editable) return false

            const columnTarget = getTableColumnResizeTarget(view, event)
            if (columnTarget) {
              event.preventDefault()
              const startX = event.clientX
              const startWidths = getRenderedTableColumnWidths(columnTarget)
              const leftWidth = startWidths[columnTarget.leftColumn]
              const rightWidth = startWidths[columnTarget.rightColumn]

              const handleMouseMove = (moveEvent: MouseEvent): void => {
                const requestedOffset = Math.round(moveEvent.clientX - startX)
                const offset = Math.min(
                  rightWidth - MIN_TABLE_COLUMN_WIDTH_PX,
                  Math.max(MIN_TABLE_COLUMN_WIDTH_PX - leftWidth, requestedOffset)
                )
                const widths = startWidths.slice()
                widths[columnTarget.leftColumn] = leftWidth + offset
                widths[columnTarget.rightColumn] = rightWidth - offset
                updateTableColumnWidths(view, columnTarget, widths)
              }
              const handleMouseUp = (): void => {
                document.removeEventListener("mousemove", handleMouseMove)
                document.removeEventListener("mouseup", handleMouseUp)
                view.dom.classList.remove("resize-cursor")
                setNativeColumnResizeHandle(view, -1)
                stopDragging = null
              }

              stopDragging = handleMouseUp
              document.addEventListener("mousemove", handleMouseMove)
              document.addEventListener("mouseup", handleMouseUp)
              return true
            }

            const target = getTableRowResizeTarget(view, event)
            if (!target) return false

            event.preventDefault()
            const startY = event.clientY
            const startHeight = target.rowElement.getBoundingClientRect().height

            const handleMouseMove = (moveEvent: MouseEvent): void => {
              const rowHeight = Math.max(MIN_TABLE_ROW_HEIGHT_PX, Math.round(startHeight + moveEvent.clientY - startY))
              const rowNode = view.state.doc.nodeAt(target.rowPosition)
              if (!rowNode || rowNode.type.name !== "tableRow" || rowNode.attrs.rowHeight === rowHeight) return

              view.dispatch(view.state.tr.setNodeMarkup(target.rowPosition, undefined, {
                ...rowNode.attrs,
                rowHeight
              }))
            }
            const handleMouseUp = (): void => {
              document.removeEventListener("mousemove", handleMouseMove)
              document.removeEventListener("mouseup", handleMouseUp)
              view.dom.classList.remove("row-resize-cursor")
              stopDragging = null
            }

            stopDragging = handleMouseUp
            view.dom.classList.add("row-resize-cursor")
            document.addEventListener("mousemove", handleMouseMove)
            document.addEventListener("mouseup", handleMouseUp)
            return true
          }
        }
      },
      view: () => ({
        destroy: () => {
          stopDragging?.()
        }
      })
    })]
  }
})

interface TableColumnResizeTarget {
  cellElement: HTMLTableCellElement
  leftColumn: number
  leftHandlePosition: number
  rightColumn: number
  map: TableMap
  tablePosition: number
}

function getTableColumnResizeTarget(view: EditorView, event: MouseEvent): TableColumnResizeTarget | null {
  const elementToRight = view.dom.ownerDocument.elementFromPoint(event.clientX + TABLE_ROW_RESIZE_AREA_PX, event.clientY)
  const cellElement = elementToRight?.closest("td, th")
  if (!(cellElement instanceof HTMLTableCellElement) || !view.dom.contains(cellElement)) return null

  const cellRect = cellElement.getBoundingClientRect()
  if (Math.abs(event.clientX - cellRect.left) > TABLE_ROW_RESIZE_AREA_PX) return null
  if (Math.abs(event.clientY - cellRect.bottom) <= TABLE_ROW_RESIZE_AREA_PX) return null

  const cellPosition = getTableCellPosition(view, cellElement)
  if (cellPosition === null) return null

  const resolvedCell = view.state.doc.resolve(cellPosition)
  const table = resolvedCell.node(-1)
  const map = TableMap.get(table)
  const tablePosition = resolvedCell.start(-1)
  const rightColumn = map.colCount(cellPosition - tablePosition)
  if (rightColumn === 0) return null

  const leftColumn = rightColumn - 1
  const leftHandlePosition = tablePosition + map.map[leftColumn]
  return { cellElement, leftColumn, leftHandlePosition, rightColumn, map, tablePosition }
}

function setNativeColumnResizeHandle(view: EditorView, position: number): void {
  const state = columnResizingPluginKey.getState(view.state) as { activeHandle: number } | undefined
  if (state?.activeHandle === position) return

  view.dispatch(view.state.tr.setMeta(columnResizingPluginKey, { setHandle: position }))
}

function getRenderedTableColumnWidths(target: TableColumnResizeTarget): number[] {
  const table = target.cellElement.closest("table")
  const columns = table ? Array.from(table.querySelectorAll<HTMLTableColElement>("colgroup > col")) : []
  const fallbackWidth = table ? table.getBoundingClientRect().width / target.map.width : MIN_TABLE_COLUMN_WIDTH_PX
  return Array.from({ length: target.map.width }, (_, column) => columns[column]?.getBoundingClientRect().width || fallbackWidth)
}

function updateTableColumnWidths(view: EditorView, target: TableColumnResizeTarget, widths: number[]): void {
  const transaction = view.state.tr
  widths.forEach((width, column) => setTableColumnWidth(view, target, transaction, column, width))
  if (transaction.docChanged) view.dispatch(transaction)
}

function setTableColumnWidth(
  view: EditorView,
  target: TableColumnResizeTarget,
  transaction: Transaction,
  column: number,
  width: number
): void {
  for (let row = 0; row < target.map.height; row += 1) {
    const mapIndex = row * target.map.width + column
    if (row > 0 && target.map.map[mapIndex] === target.map.map[mapIndex - target.map.width]) continue

    const relativeCellPosition = target.map.map[mapIndex]
    const cell = view.state.doc.nodeAt(target.tablePosition + relativeCellPosition)
    if (!cell) continue

    const cellColumn = target.map.colCount(relativeCellPosition)
    const widthIndex = column - cellColumn
    const columnWidths = cell.attrs.colwidth ? cell.attrs.colwidth.slice() : Array(cell.attrs.colspan).fill(0)
    if (columnWidths[widthIndex] === width) continue

    columnWidths[widthIndex] = width
    transaction.setNodeMarkup(target.tablePosition + relativeCellPosition, undefined, {
      ...cell.attrs,
      colwidth: columnWidths
    })
  }
}

function getTableCellPosition(view: EditorView, cellElement: HTMLTableCellElement): number | null {
  const position = view.posAtDOM(cellElement, 0)
  const resolvedPosition = view.state.doc.resolve(position)
  for (let depth = resolvedPosition.depth; depth > 0; depth -= 1) {
    const role = resolvedPosition.node(depth).type.spec.tableRole
    if (role === "cell" || role === "header_cell") return resolvedPosition.before(depth)
  }
  return null
}

function getTableRowResizeTarget(view: EditorView, event: MouseEvent): { rowElement: HTMLTableRowElement, rowPosition: number } | null {
  if (!(event.target instanceof Element)) return null

  const cellElement = event.target.closest("td, th")
  if (!(cellElement instanceof HTMLTableCellElement) || !view.dom.contains(cellElement)) return null

  const cellRect = cellElement.getBoundingClientRect()
  const isNearBottom = Math.abs(event.clientY - cellRect.bottom) <= TABLE_ROW_RESIZE_AREA_PX
  const isNearRight = Math.abs(event.clientX - cellRect.right) <= TABLE_ROW_RESIZE_AREA_PX
  if (!isNearBottom || isNearRight) return null

  const rowElement = cellElement.closest("tr")
  if (!(rowElement instanceof HTMLTableRowElement)) return null

  const cellPosition = view.posAtDOM(cellElement, 0)
  const resolvedPosition = view.state.doc.resolve(cellPosition)
  for (let depth = resolvedPosition.depth; depth > 0; depth -= 1) {
    if (resolvedPosition.node(depth).type.name === "tableRow") {
      return { rowElement, rowPosition: resolvedPosition.before(depth) }
    }
  }
  return null
}

export const PageBreak = Node.create({
  name: "pageBreak",
  group: "block",
  atom: true,
  selectable: true,
  parseHTML: () => [{ tag: "div[data-page-break]" }],
  renderHTML: () => ["div", { "data-page-break": "true", class: "document-page-break" }],
  addCommands() {
    return { setPageBreak: () => ({ commands }) => commands.insertContent({ type: this.name }) }
  }
})
