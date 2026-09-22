import { computed } from "vue"
import type { ComputedRef, Ref, ShallowRef } from "vue"
import type { Editor } from "@tiptap/vue-3"
import { defaultDocumentImageAttributes } from "./document-editor-image"
import type { DocumentImageAlignment, DocumentImageAttributes, DocumentImageCrop, DocumentImageWrap } from "./document-editor-image"

interface UseDocumentEditorImageOptions {
  editor: ShallowRef<Editor | null>
  editorStateVersion: Ref<number>
  isReadonly: ComputedRef<boolean>
}

export function useDocumentEditorImage(options: UseDocumentEditorImageOptions) {
  const isImageActive = computed(() => {
    options.editorStateVersion.value
    return Boolean(options.editor.value?.isActive("image"))
  })
  const imageAttributes = computed<DocumentImageAttributes>(() => {
    options.editorStateVersion.value
    const attributes = options.editor.value?.getAttributes("image") || {}
    return {
      widthPercent: normalizeNumber(attributes.widthPercent, 10, 100, defaultDocumentImageAttributes.widthPercent),
      alignment: normalizeAlignment(attributes.alignment),
      wrap: normalizeWrap(attributes.wrap),
      rotation: normalizeNumber(attributes.rotation, -180, 180, defaultDocumentImageAttributes.rotation),
      crop: normalizeCrop(attributes.crop),
      caption: typeof attributes.caption === "string" ? attributes.caption : "",
      sourceAspectRatio: normalizeAspectRatio(attributes.sourceAspectRatio)
    }
  })

  function updateImageAttributes(attributes: Partial<DocumentImageAttributes>): void {
    if (!options.editor.value || options.isReadonly.value || !isImageActive.value) return
    options.editor.value.chain().focus().updateAttributes("image", attributes).run()
  }

  return {
    isImageActive,
    imageAttributes,
    setImageWidth: (value: number) => updateImageAttributes({ widthPercent: normalizeNumber(value, 10, 100, imageAttributes.value.widthPercent) }),
    setImageAlignment: (value: DocumentImageAlignment) => updateImageAttributes({ alignment: normalizeAlignment(value), wrap: "none" }),
    setImageWrap: (value: DocumentImageWrap) => updateImageAttributes({ wrap: normalizeWrap(value) }),
    rotateImage: (degrees: number) => updateImageAttributes({ rotation: normalizeRotation(imageAttributes.value.rotation + degrees) }),
    setImageCrop: (value: DocumentImageCrop) => updateImageAttributes({ crop: normalizeCrop(value) }),
    setImageCaption: (value: string) => updateImageAttributes({ caption: value.trim().slice(0, 255) }),
    removeImage: () => {
      if (!options.editor.value || options.isReadonly.value || !isImageActive.value) return
      options.editor.value.chain().focus().deleteSelection().run()
    }
  }
}

function normalizeNumber(value: unknown, minimum: number, maximum: number, fallback: number): number {
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) return fallback
  return Math.min(maximum, Math.max(minimum, Math.round(numericValue)))
}

function normalizeRotation(value: number): number {
  const normalized = value % 360
  return normalized > 180 ? normalized - 360 : normalized < -180 ? normalized + 360 : normalized
}

function normalizeAspectRatio(value: unknown): number {
  const numericValue = Number(value)
  return Number.isFinite(numericValue) && numericValue > 0 ? numericValue : defaultDocumentImageAttributes.sourceAspectRatio
}

function normalizeAlignment(value: unknown): DocumentImageAlignment {
  return value === "left" || value === "right" || value === "center" ? value : defaultDocumentImageAttributes.alignment
}

function normalizeWrap(value: unknown): DocumentImageWrap {
  return value === "left" || value === "right" || value === "none" ? value : defaultDocumentImageAttributes.wrap
}

function normalizeCrop(value: unknown): DocumentImageCrop {
  return value === "square" || value === "4:3" || value === "16:9" || value === "original" ? value : defaultDocumentImageAttributes.crop
}
