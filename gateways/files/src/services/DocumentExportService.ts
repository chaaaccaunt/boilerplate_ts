import {
  AlignmentType,
  Document as DocxDocument,
  ExternalHyperlink,
  Footer,
  HeadingLevel,
  ImageRun,
  LineRuleType,
  Packer,
  PageBreak,
  PageNumber,
  Paragraph,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  UnderlineType,
  WidthType
} from "docx"
import type { ParagraphChild } from "docx"

interface TipTapNode {
  type?: string
  text?: string
  attrs?: Record<string, unknown>
  marks?: TipTapMark[]
  content?: TipTapNode[]
}

interface TipTapMark {
  type?: string
  attrs?: Record<string, unknown>
}

interface DocumentPageMargins {
  top: number
  right: number
  bottom: number
  left: number
}

export class DocumentExportService {
  private static readonly defaultDocumentPageMargins: DocumentPageMargins = {
    top: 18,
    right: 20,
    bottom: 18,
    left: 20
  }

  private static readonly documentPageWidthMillimeters = 210
  private static readonly documentPageHeightMillimeters = 297
  private static readonly minimumDocumentContentSizeMillimeters = 10

  create(document: { title: string, contentJson: string }): Promise<Buffer> {
    const rootNode = this.parseDocumentJson(document.contentJson)
    const file = new DocxDocument({
      title: document.title,
      sections: [
        {
          properties: {
            page: {
              size: {
                width: "210mm",
                height: "297mm"
              },
              margin: this.getDocxPageMargins(rootNode)
            }
          },
          footers: {
            default: this.createDocxFooter()
          },
          children: this.createDocxChildren(rootNode)
        }
      ],
      styles: {
        default: {
          document: {
            run: {
              font: "Calibri",
              size: 24
            },
            paragraph: {
              spacing: {
                after: 160
              }
            }
          }
        }
      }
    })

    return Packer.toBuffer(file)
  }

  private createDocxChildren(rootNode: TipTapNode): (Paragraph | Table)[] {
    const pageNodes = (rootNode.content || []).filter((node) => node.type === "page")
    const children = pageNodes.length
      ? this.createDocxPageChildren(pageNodes)
      : this.createDocxBlockChildren(rootNode.content || [])

    return children.length ? children : [new Paragraph("")]
  }

  private createDocxPageChildren(pageNodes: TipTapNode[]): (Paragraph | Table)[] {
    return pageNodes.flatMap((pageNode, pageIndex) => {
      const children = this.createDocxBlockChildren(pageNode.content || [])
      if (pageIndex === 0) return children

      return [
        new Paragraph({ children: [new PageBreak()] }),
        ...children
      ]
    })
  }

  private parseDocumentJson(contentJson: string): TipTapNode {
    try {
      const parsed = JSON.parse(contentJson) as TipTapNode
      if (parsed && typeof parsed === "object") return parsed
    } catch (error) {
      // Некорректный JSON редактора не должен ломать экспорт документа.
    }

    return {
      type: "doc",
      attrs: {
        pageMargins: DocumentExportService.defaultDocumentPageMargins
      },
      content: [
        {
          type: "page",
          content: [{ type: "paragraph" }]
        }
      ]
    }
  }

  private getDocxPageMargins(rootNode: TipTapNode): { top: `${number}mm`, right: `${number}mm`, bottom: `${number}mm`, left: `${number}mm` } {
    const pageMargins = this.getStoredPageMargins(rootNode)

    return {
      top: `${pageMargins.top}mm`,
      right: `${pageMargins.right}mm`,
      bottom: `${pageMargins.bottom}mm`,
      left: `${pageMargins.left}mm`
    }
  }

  private getStoredPageMargins(rootNode: TipTapNode): DocumentPageMargins {
    const value = rootNode.attrs?.pageMargins && typeof rootNode.attrs.pageMargins === "object"
      ? rootNode.attrs.pageMargins as Partial<DocumentPageMargins>
      : {}

    return this.normalizeDocumentPageMargins(value)
  }

  private normalizeDocumentPageMargins(value: Partial<DocumentPageMargins>): DocumentPageMargins {
    const margins = {
      top: this.normalizePageMarginValue(value.top, DocumentExportService.defaultDocumentPageMargins.top),
      right: this.normalizePageMarginValue(value.right, DocumentExportService.defaultDocumentPageMargins.right),
      bottom: this.normalizePageMarginValue(value.bottom, DocumentExportService.defaultDocumentPageMargins.bottom),
      left: this.normalizePageMarginValue(value.left, DocumentExportService.defaultDocumentPageMargins.left)
    }

    const left = Math.min(margins.left, DocumentExportService.documentPageWidthMillimeters - DocumentExportService.minimumDocumentContentSizeMillimeters)
    const right = Math.min(margins.right, DocumentExportService.documentPageWidthMillimeters - left - DocumentExportService.minimumDocumentContentSizeMillimeters)
    const top = Math.min(margins.top, DocumentExportService.documentPageHeightMillimeters - DocumentExportService.minimumDocumentContentSizeMillimeters)
    const bottom = Math.min(margins.bottom, DocumentExportService.documentPageHeightMillimeters - top - DocumentExportService.minimumDocumentContentSizeMillimeters)

    return {
      top,
      right,
      bottom,
      left
    }
  }

  private normalizePageMarginValue(value: unknown, fallback: number): number {
    const numericValue = Number(value)
    if (!Number.isFinite(numericValue)) return fallback

    return Math.max(0, numericValue)
  }

  private createDocxBlockChildren(nodes: TipTapNode[]): (Paragraph | Table)[] {
    return nodes.flatMap((node) => this.createDocxBlockChild(node))
  }

  private createDocxBlockChild(node: TipTapNode): (Paragraph | Table)[] {
    if (node.type === "heading") return [this.createDocxParagraph(node, this.getHeadingLevel(node))]
    if (node.type === "paragraph") return [this.createDocxParagraph(node)]
    if (node.type === "bulletList") return this.createDocxListChildren(node, false, 0)
    if (node.type === "orderedList") return this.createDocxListChildren(node, true, 0)
    if (node.type === "table") return [this.createDocxTable(node)]
    if (node.type === "pageBreak") return [new Paragraph({ children: [new PageBreak()] })]
    if (node.type === "horizontalRule") return [new Paragraph({ children: [new TextRun("────────────────────────")] })]
    if (node.type === "blockquote") {
      return (node.content || [])
        .filter((child) => child.type === "paragraph")
        .map((child) => new Paragraph({
          children: [new TextRun("  "), ...this.createDocxInlineChildren(child.content || [])],
          indent: { left: 360 }
        }))
    }

    if (node.content?.length) return this.createDocxBlockChildren(node.content)
    return []
  }

  private createDocxParagraph(node: TipTapNode, heading?: (typeof HeadingLevel)[keyof typeof HeadingLevel]): Paragraph {
    const children = this.createDocxInlineChildren(node.content || [])

    return new Paragraph({
      children: children.length ? children : [new TextRun("")],
      heading,
      alignment: this.getDocxAlignment(node),
      indent: this.getDocxIndent(node),
      spacing: this.getDocxParagraphSpacing(node)
    })
  }

  private createDocxFooter(): Footer {
    return new Footer({
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: "Страница " }),
            new TextRun({ children: [PageNumber.CURRENT] }),
            new TextRun({ text: " из " }),
            new TextRun({ children: [PageNumber.TOTAL_PAGES] })
          ]
        })
      ]
    })
  }

  private createDocxListChildren(node: TipTapNode, ordered: boolean, level: number): Paragraph[] {
    let itemNumber = 1

    return (node.content || []).flatMap((item) => {
      const itemPrefix = ordered ? `${itemNumber++}. ` : "• "
      const itemChildren = item.content || []

      return itemChildren.flatMap((child) => {
        if (child.type === "paragraph") {
          return [
            new Paragraph({
              children: [
                new TextRun({ text: itemPrefix }),
                ...this.createDocxInlineChildren(child.content || [])
              ],
              indent: {
                left: 360 * (level + 1)
              }
            })
          ]
        }

        if (child.type === "bulletList") return this.createDocxListChildren(child, false, level + 1)
        if (child.type === "orderedList") return this.createDocxListChildren(child, true, level + 1)
        return this.createDocxBlockChild(child).filter((block): block is Paragraph => block instanceof Paragraph)
      })
    })
  }

  private createDocxTable(node: TipTapNode): Table {
    const rows = (node.content || [])
      .filter((row) => row.type === "tableRow")
      .map((row) => new TableRow({
        children: (row.content || [])
          .filter((cell) => cell.type === "tableCell" || cell.type === "tableHeader")
          .map((cell) => new TableCell({
            children: this.createDocxTableCellChildren(cell),
            shading: cell.type === "tableHeader" ? { fill: "F1F5F9" } : undefined
          }))
      }))

    return new Table({
      rows: rows.length ? rows : [new TableRow({ children: [new TableCell({ children: [new Paragraph("")] })] })],
      layout: TableLayoutType.AUTOFIT,
      width: {
        size: 100,
        type: WidthType.PERCENTAGE
      }
    })
  }

  private createDocxTableCellChildren(node: TipTapNode): Paragraph[] {
    const children = this.createDocxBlockChildren(node.content || [])
      .filter((child): child is Paragraph => child instanceof Paragraph)

    return children.length ? children : [new Paragraph("")]
  }

  private createDocxInlineChildren(nodes: TipTapNode[]): ParagraphChild[] {
    return nodes.flatMap((node) => this.createDocxInlineChild(node))
  }

  private createDocxInlineChild(node: TipTapNode): ParagraphChild[] {
    if (node.type === "text") {
      const textRun = this.createDocxTextRun(node)
      const link = this.getMarkLink(node)

      if (!link) return [textRun]

      return [
        new ExternalHyperlink({
          link,
          children: [textRun]
        })
      ]
    }

    if (node.type === "hardBreak") return [new TextRun({ text: "", break: 1 })]
    if (node.type === "image") return [this.createDocxImageChild(node)]
    if (node.content?.length) return this.createDocxInlineChildren(node.content)

    return []
  }

  private createDocxTextRun(node: TipTapNode): TextRun {
    const marks = node.marks || []

    return new TextRun({
      text: node.text || "",
      bold: marks.some((mark) => mark.type === "bold"),
      italics: marks.some((mark) => mark.type === "italic"),
      strike: marks.some((mark) => mark.type === "strike"),
      underline: marks.some((mark) => mark.type === "underline") ? { type: UnderlineType.SINGLE } : undefined,
      style: this.getMarkLink(node) ? "Hyperlink" : undefined,
      color: this.getTextStyleAttribute(node, "color")?.replace(/^#/, ""),
      size: this.getDocxFontSize(node),
      font: this.getDocxFontFamily(node),
      shading: this.getTextStyleAttribute(node, "backgroundColor")
        ? { fill: this.getTextStyleAttribute(node, "backgroundColor")?.replace(/^#/, "") }
        : undefined
    })
  }

  private createDocxImageChild(node: TipTapNode): ParagraphChild {
    const src = typeof node.attrs?.src === "string" ? node.attrs.src : ""
    const title = typeof node.attrs?.alt === "string" && node.attrs.alt.trim() ? node.attrs.alt.trim() : "Изображение"
    const image = this.createDocxBase64Image(src, title)

    if (image) return image
    if (src) {
      return new ExternalHyperlink({
        link: src,
        children: [new TextRun({ text: title, style: "Hyperlink" })]
      })
    }

    return new TextRun(title)
  }

  private createDocxBase64Image(src: string, title: string): ImageRun | null {
    const match = src.match(/^data:image\/(png|jpe?g|gif|bmp);base64,(.+)$/i)
    if (!match) return null

    const type = match[1].toLowerCase() === "jpeg" ? "jpg" : match[1].toLowerCase()

    return new ImageRun({
      type: type as "jpg" | "png" | "gif" | "bmp",
      data: Buffer.from(match[2], "base64"),
      transformation: {
        width: 520,
        height: 320
      },
      altText: {
        name: title,
        title,
        description: title
      }
    })
  }

  private getHeadingLevel(node: TipTapNode): (typeof HeadingLevel)[keyof typeof HeadingLevel] {
    const level = node.attrs?.level
    if (level === 1) return HeadingLevel.HEADING_1
    if (level === 2) return HeadingLevel.HEADING_2
    if (level === 3) return HeadingLevel.HEADING_3
    if (level === 4) return HeadingLevel.HEADING_4
    if (level === 5) return HeadingLevel.HEADING_5
    return HeadingLevel.HEADING_6
  }

  private getDocxAlignment(node: TipTapNode): (typeof AlignmentType)[keyof typeof AlignmentType] | undefined {
    const textAlign = node.attrs?.textAlign
    if (textAlign === "center") return AlignmentType.CENTER
    if (textAlign === "right") return AlignmentType.RIGHT
    if (textAlign === "justify") return AlignmentType.JUSTIFIED
    return undefined
  }

  private getDocxIndent(node: TipTapNode): { left: number } | undefined {
    const indentLevel = Number(node.attrs?.indentLevel || 0)
    if (!indentLevel) return undefined

    return {
      left: Math.min(8, Math.max(0, indentLevel)) * 360
    }
  }

  private getDocxParagraphSpacing(node: TipTapNode): { after: number, line?: number, lineRule?: (typeof LineRuleType)[keyof typeof LineRuleType] } {
    const lineHeight = this.getTextStyleAttributeFromNodeOrChildren(node, "lineHeight")
    const numericLineHeight = lineHeight ? Number.parseFloat(lineHeight) : null

    return {
      after: 160,
      ...(numericLineHeight && Number.isFinite(numericLineHeight)
        ? {
            line: Math.round(numericLineHeight * 240),
            lineRule: LineRuleType.AUTO
          }
        : {})
    }
  }

  private getDocxFontSize(node: TipTapNode): number | undefined {
    const fontSize = this.getTextStyleAttribute(node, "fontSize")
    if (!fontSize) return undefined

    const numericSize = Number.parseFloat(fontSize)
    if (!Number.isFinite(numericSize)) return undefined

    return Math.round(numericSize * 1.5)
  }

  private getDocxFontFamily(node: TipTapNode): string | undefined {
    const fontFamily = this.getTextStyleAttribute(node, "fontFamily")
    if (!fontFamily) return undefined

    return fontFamily.split(",")[0].replace(/["']/g, "").trim() || undefined
  }

  private getTextStyleAttribute(node: TipTapNode, attributeName: string): string | undefined {
    const textStyleMark = node.marks?.find((mark) => mark.type === "textStyle")
    const value = textStyleMark?.attrs?.[attributeName]

    return typeof value === "string" && value.trim() ? value.trim() : undefined
  }

  private getTextStyleAttributeFromNodeOrChildren(node: TipTapNode, attributeName: string): string | undefined {
    const ownValue = this.getTextStyleAttribute(node, attributeName)
    if (ownValue) return ownValue

    return (node.content || [])
      .map((child) => this.getTextStyleAttributeFromNodeOrChildren(child, attributeName))
      .find((value): value is string => Boolean(value))
  }

  private getMarkLink(node: TipTapNode): string | null {
    const linkMark = node.marks?.find((mark) => mark.type === "link")
    const href = linkMark?.attrs?.href

    return typeof href === "string" && href.trim() ? href.trim() : null
  }

  createEmptyDocumentJson(): string {
    return JSON.stringify({
      type: "doc",
      attrs: {
        pageMargins: DocumentExportService.defaultDocumentPageMargins
      },
      content: [
        {
          type: "page",
          content: [{ type: "paragraph" }]
        }
      ]
    })
  }

  getSafeFileName(title: string): string {
    const safeTitle = title
      .replace(/[/\\:*?"<>|\x00-\x1F]/g, "_")
      .replace(/\.+$/g, "")
      .trim()

    return safeTitle || "document"
  }

}
