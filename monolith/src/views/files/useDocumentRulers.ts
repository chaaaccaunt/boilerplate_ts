import { ref } from "vue"
import type { Ref } from "vue"
import {
  INDENT_STEP_MM,
  PAGE_HEIGHT_MM,
  PAGE_WIDTH_MM
} from "./document-editor-config"
import type { DocumentPageMargins, RulerDragTarget } from "./document-editor-config"
import { getPageMarginMaxValue, normalizePageMarginValue } from "./document-content"

interface UseDocumentRulersOptions {
  pageMargins: Ref<DocumentPageMargins>
  isReadonly: Readonly<Ref<boolean>>
  setIndent: (indentLevel: number) => void
  onLayoutChanged: () => void
}

export function useDocumentRulers(options: UseDocumentRulersOptions) {
  const horizontalRulerElement = ref<HTMLElement | null>(null)
  const verticalRulerElement = ref<HTMLElement | null>(null)
  const activeRulerTarget = ref<RulerDragTarget | null>(null)

  function normalizeMarginValue(key: keyof DocumentPageMargins, value: unknown, fallback: number): number {
    return normalizePageMarginValue(key, value, fallback, options.pageMargins.value)
  }

  function startHorizontalRulerDrag(target: RulerDragTarget, event: PointerEvent): void {
    if (options.isReadonly.value) return

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
    if (options.isReadonly.value) return

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

    if (target === "left" || target === "right") {
      const value = target === "left" ? pageValue : PAGE_WIDTH_MM - pageValue
      options.pageMargins.value = {
        ...options.pageMargins.value,
        [target]: normalizeMarginValue(target, value, options.pageMargins.value[target])
      }
      options.onLayoutChanged()
      return
    }

    options.setIndent(Math.round((pageValue - options.pageMargins.value.left) / INDENT_STEP_MM))
  }

  function updateVerticalRulerValue(target: Extract<keyof DocumentPageMargins, "top" | "bottom">, clientY: number): void {
    const rulerElement = verticalRulerElement.value
    if (!rulerElement) return

    const rect = rulerElement.getBoundingClientRect()
    const pageValue = getValueFromRulerPosition(clientY - rect.top, rect.height, PAGE_HEIGHT_MM)

    options.pageMargins.value = {
      ...options.pageMargins.value,
      [target]: normalizeMarginValue(target, target === "top" ? pageValue : PAGE_HEIGHT_MM - pageValue, options.pageMargins.value[target])
    }
    options.onLayoutChanged()
  }

  return {
    activeRulerTarget,
    horizontalRulerElement,
    startHorizontalRulerDrag,
    startVerticalRulerDrag,
    verticalRulerElement
  }
}

function getValueFromRulerPosition(position: number, length: number, maxValue: number): number {
  if (!length) return 0
  return Math.min(maxValue, Math.max(0, (position / length) * maxValue))
}
