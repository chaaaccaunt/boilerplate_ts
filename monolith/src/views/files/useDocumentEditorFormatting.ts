import type { Editor } from "@tiptap/vue-3"
import "@tiptap/starter-kit"
import "@tiptap/extension-text-style"
import type { Ref, ShallowRef } from "vue"
import { MAX_INDENT_LEVEL } from "./document-editor-config"

interface DocumentEditorFormattingOptions {
  editor: ShallowRef<Editor | null>
  isReadonly: Readonly<Ref<boolean>>
}

export function useDocumentEditorFormatting(options: DocumentEditorFormattingOptions) {
  const { editor, isReadonly } = options

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

  function increaseIndent(): void {
    setCurrentIndent(getCurrentIndentLevel() + 1)
  }

  function decreaseIndent(): void {
    setCurrentIndent(getCurrentIndentLevel() - 1)
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

  return {
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
  }
}
