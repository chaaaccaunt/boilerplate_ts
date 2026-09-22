import { mergeAttributes } from "@tiptap/core"
import Image from "@tiptap/extension-image"
import { VueNodeViewRenderer } from "@tiptap/vue-3"
import DocumentImageNode from "./components/DocumentImageNode.vue"

export type DocumentImageAlignment = "left" | "center" | "right"
export type DocumentImageWrap = "none" | "left" | "right"
export type DocumentImageCrop = "original" | "square" | "4:3" | "16:9"

export interface DocumentImageAttributes {
  widthPercent: number
  alignment: DocumentImageAlignment
  wrap: DocumentImageWrap
  rotation: number
  crop: DocumentImageCrop
  caption: string
  sourceAspectRatio: number
}

export const defaultDocumentImageAttributes: DocumentImageAttributes = {
  widthPercent: 60,
  alignment: "center",
  wrap: "none",
  rotation: 0,
  crop: "original",
  caption: "",
  sourceAspectRatio: 1
}

export const DocumentImage = Image.extend({
  parseHTML() {
    return [
      {
        tag: "figure[data-document-image]",
        getAttrs: (element) => {
          if (!(element instanceof HTMLElement)) return false
          const image = element.querySelector("img")
          if (!image) return false
          return {
            src: image.getAttribute("src"),
            alt: image.getAttribute("alt"),
            title: image.getAttribute("title"),
            widthPercent: element.dataset.widthPercent,
            alignment: element.dataset.alignment,
            wrap: element.dataset.wrap,
            rotation: element.dataset.rotation,
            crop: element.dataset.crop,
            caption: element.dataset.caption || element.querySelector("figcaption")?.textContent || "",
            sourceAspectRatio: element.dataset.sourceAspectRatio
          }
        }
      },
      { tag: "img[src]" }
    ]
  },
  addNodeView() {
    return VueNodeViewRenderer(DocumentImageNode)
  },
  addAttributes() {
    return {
      ...this.parent?.(),
      widthPercent: {
        default: defaultDocumentImageAttributes.widthPercent,
        parseHTML: (element) => normalizeNumber(element.dataset.widthPercent, 10, 100, defaultDocumentImageAttributes.widthPercent),
        renderHTML: () => ({})
      },
      alignment: {
        default: defaultDocumentImageAttributes.alignment,
        parseHTML: (element) => normalizeAlignment(element.dataset.alignment),
        renderHTML: () => ({})
      },
      wrap: {
        default: defaultDocumentImageAttributes.wrap,
        parseHTML: (element) => normalizeWrap(element.dataset.wrap),
        renderHTML: () => ({})
      },
      rotation: {
        default: defaultDocumentImageAttributes.rotation,
        parseHTML: (element) => normalizeNumber(element.dataset.rotation, -180, 180, defaultDocumentImageAttributes.rotation),
        renderHTML: () => ({})
      },
      crop: {
        default: defaultDocumentImageAttributes.crop,
        parseHTML: (element) => normalizeCrop(element.dataset.crop),
        renderHTML: () => ({})
      },
      caption: {
        default: defaultDocumentImageAttributes.caption,
        parseHTML: (element) => element.dataset.caption || "",
        renderHTML: () => ({})
      },
      sourceAspectRatio: {
        default: defaultDocumentImageAttributes.sourceAspectRatio,
        parseHTML: (element) => normalizeAspectRatio(element.dataset.sourceAspectRatio),
        renderHTML: () => ({})
      }
    }
  },
  renderHTML({ HTMLAttributes, node }) {
    const widthPercent = normalizeNumber(node.attrs.widthPercent, 10, 100, defaultDocumentImageAttributes.widthPercent)
    const alignment = normalizeAlignment(node.attrs.alignment)
    const wrap = normalizeWrap(node.attrs.wrap)
    const rotation = normalizeNumber(node.attrs.rotation, -180, 180, defaultDocumentImageAttributes.rotation)
    const crop = normalizeCrop(node.attrs.crop)
    const caption = typeof node.attrs.caption === "string" ? node.attrs.caption : ""
    const imageAttributes = mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
      "data-crop": crop,
      style: createImageElementStyle(rotation, crop)
    })

    const figureAttributes = {
      "data-document-image": "true",
      "data-width-percent": String(widthPercent),
      "data-alignment": alignment,
      "data-wrap": wrap,
      "data-rotation": String(rotation),
      "data-crop": crop,
      "data-caption": caption,
      "data-source-aspect-ratio": String(normalizeAspectRatio(node.attrs.sourceAspectRatio)),
      style: createImageContainerStyle(widthPercent, alignment, wrap)
    }

    return caption
      ? ["figure", figureAttributes, ["img", imageAttributes], ["figcaption", {}, caption]]
      : ["figure", figureAttributes, ["img", imageAttributes]]
  }
}).configure({ allowBase64: true })

function createImageContainerStyle(widthPercent: number, alignment: DocumentImageAlignment, wrap: DocumentImageWrap): string {
  const styles = [`width: ${widthPercent}%`]
  if (wrap === "left") styles.push("float: left", "margin: 0.5rem 1rem 0.5rem 0")
  if (wrap === "right") styles.push("float: right", "margin: 0.5rem 0 0.5rem 1rem")
  if (wrap === "none" && alignment === "left") styles.push("display: block", "margin: 0.75rem auto 0.75rem 0")
  if (wrap === "none" && alignment === "center") styles.push("display: block", "margin: 0.75rem auto")
  if (wrap === "none" && alignment === "right") styles.push("display: block", "margin: 0.75rem 0 0.75rem auto")
  return styles.join("; ")
}

function createImageElementStyle(rotation: number, crop: DocumentImageCrop): string {
  const styles = ["display: block", "width: 100%", "height: auto", `transform: rotate(${rotation}deg)`]
  if (crop !== "original") styles.push(`aspect-ratio: ${crop.replace(":", " / ")}`, "object-fit: cover")
  return styles.join("; ")
}

function normalizeNumber(value: unknown, minimum: number, maximum: number, fallback: number): number {
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) return fallback
  return Math.min(maximum, Math.max(minimum, Math.round(numericValue)))
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
