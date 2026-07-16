declare module "html-to-docx" {
  interface HtmlToDocxOptions {
    title?: string
    orientation?: "portrait" | "landscape"
    margins?: {
      top?: number
      right?: number
      bottom?: number
      left?: number
      header?: number
      footer?: number
      gutter?: number
    }
  }

  export default function htmlToDocx(
    htmlString: string,
    headerHTMLString?: string,
    documentOptions?: HtmlToDocxOptions,
    footerHTMLString?: string
  ): Promise<Buffer | ArrayBuffer | Uint8Array>
}
