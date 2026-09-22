import { nextTick, onBeforeUnmount, ref } from "vue"
import type { ShallowRef } from "vue"
import type { Editor } from "@tiptap/vue-3"
import type { Node as ProseMirrorNode } from "@tiptap/pm/model"

export function useDocumentPagination(editor: ShallowRef<Editor | null>) {
  const activePageIndex = ref(0)
  let paginationFrame: number | null = null
  let isPaginating = false

  function updateActivePageIndex(): void {
    if (!editor.value) return
    try {
      const cursorRect = editor.value.view.coordsAtPos(editor.value.state.selection.from)
      const pages = Array.from(editor.value.view.dom.querySelectorAll<HTMLElement>("[data-document-page]"))
      const pageIndex = pages.findIndex((page) => {
        const rect = page.getBoundingClientRect()
        return cursorRect.top >= rect.top && cursorRect.top <= rect.bottom
      })
      activePageIndex.value = pageIndex >= 0 ? pageIndex : 0
    } catch (error) {
      activePageIndex.value = 0
    }
  }

  function schedulePagination(): void {
    if (typeof window === "undefined" || paginationFrame !== null || isPaginating) return
    nextTick(() => {
      paginationFrame = window.requestAnimationFrame(() => {
        paginationFrame = null
        normalizePages()
      })
    })
  }

  function normalizePages(): void {
    if (!editor.value || isPaginating) return
    const pageElements = Array.from(editor.value.view.dom.querySelectorAll<HTMLElement>("[data-document-page]"))
    const pageIndex = pageElements.findIndex((page) => page.scrollHeight > page.clientHeight + 2)
    if (pageIndex < 0) return

    const { state, view } = editor.value
    const pageType = state.schema.nodes.page
    const pageInfo = getPageInfo(pageIndex)
    if (!pageType || !pageInfo || pageInfo.node.childCount <= 1) return
    const lastChild = pageInfo.node.lastChild
    if (!lastChild) return

    const lastChildStart = pageInfo.pos + 1 + pageInfo.node.content.size - lastChild.nodeSize
    let transaction = state.tr.delete(lastChildStart, lastChildStart + lastChild.nodeSize)
    const nextPageInfo = getPageInfo(pageIndex + 1)
    transaction = nextPageInfo
      ? transaction.insert(nextPageInfo.pos + 1 - lastChild.nodeSize, lastChild)
      : transaction.insert(pageInfo.pos + pageInfo.node.nodeSize - lastChild.nodeSize, pageType.create(null, lastChild))

    isPaginating = true
    view.dispatch(transaction)
    isPaginating = false
    schedulePagination()
  }

  function getPageInfo(pageIndex: number): { node: ProseMirrorNode, pos: number } | null {
    if (!editor.value) return null
    let currentIndex = 0
    let foundPage: { node: ProseMirrorNode, pos: number } | null = null
    editor.value.state.doc.forEach((node, offset) => {
      if (node.type.name !== "page") return
      if (currentIndex === pageIndex) foundPage = { node, pos: offset }
      currentIndex += 1
    })
    return foundPage
  }

  onBeforeUnmount(() => {
    if (paginationFrame !== null) window.cancelAnimationFrame(paginationFrame)
  })

  return { activePageIndex, updateActivePageIndex, schedulePagination }
}
