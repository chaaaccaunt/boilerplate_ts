import {
  defaultPageMargins,
  MIN_DOCUMENT_CONTENT_SIZE_MM,
  PAGE_HEIGHT_MM,
  PAGE_WIDTH_MM
} from "./document-editor-config"
import type { DocumentPageMargins } from "./document-editor-config"

export function parseDocumentContent(contentJson: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(contentJson)
    if (parsed && typeof parsed === "object") return normalizeDocumentContentShape(parsed as Record<string, unknown>)
  } catch (error) {
    return createDefaultDocumentContent()
  }
  return createDefaultDocumentContent()
}

export function createDefaultDocumentContent(): Record<string, unknown> {
  return {
    type: "doc",
    attrs: { pageMargins: defaultPageMargins },
    content: [{ type: "page", content: [{ type: "paragraph" }] }]
  }
}

export function getStoredPageMargins(content: Record<string, unknown>): DocumentPageMargins {
  const attrs = content.attrs && typeof content.attrs === "object" ? content.attrs as Record<string, unknown> : {}
  const value = attrs.pageMargins && typeof attrs.pageMargins === "object" ? attrs.pageMargins as Partial<DocumentPageMargins> : {}
  return normalizePageMargins(value)
}

export function normalizePageMarginValue(
  key: keyof DocumentPageMargins,
  value: unknown,
  fallback: number,
  margins: DocumentPageMargins
): number {
  return Math.min(getPageMarginMaxValue(key, margins), normalizeRawMarginValue(value, fallback))
}

export function getPageMarginMaxValue(key: keyof DocumentPageMargins, margins: DocumentPageMargins): number {
  if (key === "left") return Math.max(0, PAGE_WIDTH_MM - margins.right - MIN_DOCUMENT_CONTENT_SIZE_MM)
  if (key === "right") return Math.max(0, PAGE_WIDTH_MM - margins.left - MIN_DOCUMENT_CONTENT_SIZE_MM)
  if (key === "top") return Math.max(0, PAGE_HEIGHT_MM - margins.bottom - MIN_DOCUMENT_CONTENT_SIZE_MM)
  return Math.max(0, PAGE_HEIGHT_MM - margins.top - MIN_DOCUMENT_CONTENT_SIZE_MM)
}

function normalizeDocumentContentShape(content: Record<string, unknown>): Record<string, unknown> {
  if (content.type !== "doc") return createDefaultDocumentContent()
  const contentNodes = Array.isArray(content.content) ? content.content : []
  const hasPageNodes = contentNodes.some((node) => Boolean(node && typeof node === "object" && (node as Record<string, unknown>).type === "page"))
  if (hasPageNodes) return content
  return { ...content, content: [{ type: "page", content: contentNodes.length ? contentNodes : [{ type: "paragraph" }] }] }
}

function normalizePageMargins(value: Partial<DocumentPageMargins>): DocumentPageMargins {
  const margins = {
    top: normalizeRawMarginValue(value.top, defaultPageMargins.top),
    right: normalizeRawMarginValue(value.right, defaultPageMargins.right),
    bottom: normalizeRawMarginValue(value.bottom, defaultPageMargins.bottom),
    left: normalizeRawMarginValue(value.left, defaultPageMargins.left)
  }
  const left = Math.min(margins.left, PAGE_WIDTH_MM - MIN_DOCUMENT_CONTENT_SIZE_MM)
  const right = Math.min(margins.right, getPageMarginMaxValue("right", { ...margins, left }))
  const top = Math.min(margins.top, PAGE_HEIGHT_MM - MIN_DOCUMENT_CONTENT_SIZE_MM)
  const bottom = Math.min(margins.bottom, getPageMarginMaxValue("bottom", { ...margins, top }))
  return { top, right, bottom, left }
}

function normalizeRawMarginValue(value: unknown, fallback: number): number {
  const numericValue = Number(value)
  return Number.isFinite(numericValue) ? Math.max(0, numericValue) : fallback
}
