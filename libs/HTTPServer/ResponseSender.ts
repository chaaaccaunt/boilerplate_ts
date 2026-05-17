import { ServerResponse } from "http"
import { createReadStream } from "fs"
import type { iHTTPConfig } from "."

export class HTTPResponseSender {
  constructor(private readonly config: iHTTPConfig) { }

  sendSuccess(response: ServerResponse, status: number, result: unknown): void {
    this.sendJson(response, status, {
      ok: true,
      result,
      error: null
    })
  }

  sendError(response: ServerResponse, status: number, code: string, message: string): void {
    this.sendJson(response, status, {
      ok: false,
      result: null,
      error: {
        code,
        message
      }
    })
  }

  sendFile(response: ServerResponse, result: iContracts.iFileControllerResult): void {
    this.setCorsHeaders(response)
    response.statusCode = 200
    response.setHeader("Content-Type", result.file.mimeType)
    response.setHeader("Content-Disposition", this.getContentDisposition(result.file.originalName, result.file.disposition || "attachment"))

    createReadStream(result.file.path)
      .on("error", () => {
        if (!response.headersSent) {
          this.sendError(response, 404, "NOT_FOUND", "Файл не найден")
        } else {
          response.destroy()
        }
      })
      .pipe(response)
  }

  applyControllerResult(response: ServerResponse, result: unknown): void {
    if (!this.isControllerResult(result)) return

    const cookies = [
      ...(result.setCookies || []).map((cookie) => this.serializeCookie(cookie)),
      ...this.getClearCookieHeaders(result.clearCookies || [])
    ]

    if (cookies.length) {
      response.setHeader("Set-Cookie", cookies)
    }
  }

  applyClearCookies(response: ServerResponse, cookieNames: string[]): void {
    const cookies = this.getClearCookieHeaders(cookieNames)

    if (cookies.length) {
      response.setHeader("Set-Cookie", cookies)
    }
  }

  getControllerResultData(result: unknown): unknown {
    if (this.isControllerResult(result)) return result.data
    return result
  }

  isFileControllerResult(result: unknown): result is iContracts.iFileControllerResult {
    if (typeof result !== "object" || result === null || Array.isArray(result)) return false
    if (!("file" in result)) return false

    const file = result.file
    if (typeof file !== "object" || file === null || Array.isArray(file)) return false

    return (
      "path" in file &&
      "originalName" in file &&
      "mimeType" in file
    )
  }

  private sendJson(response: ServerResponse, status: number, payload: iContracts.iApiResponse): void {
    response.statusCode = status
    this.setCorsHeaders(response)
    response.setHeader("Content-Type", "application/json; charset=utf-8")
    response.end(JSON.stringify(payload))
  }

  private setCorsHeaders(response: ServerResponse): void {
    response.setHeader("Access-Control-Allow-Origin", this.config.origin)
    response.setHeader("Access-Control-Allow-Credentials", "true")
    response.setHeader("Vary", "Origin")
  }

  private getContentDisposition(fileName: string, disposition: "attachment" | "inline"): string {
    const asciiFileName = fileName.replace(/[^\x20-\x7E]/g, "_").replace(/["\\]/g, "_")
    return `${disposition}; filename="${asciiFileName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`
  }

  private getClearCookieHeaders(cookieNames: string[]): string[] {
    return cookieNames.map((name) => this.serializeCookie({
      name,
      value: "",
      options: {
        httpOnly: true,
        sameSite: "strict",
        path: "/",
        maxAge: 0
      }
    }))
  }

  private isControllerResult(result: unknown): result is iContracts.iControllerResult {
    if (typeof result !== "object" || result === null || Array.isArray(result)) return false
    return "data" in result || "setCookies" in result || "clearCookies" in result
  }

  private serializeCookie(cookie: iContracts.iSetCookie): string {
    const options = cookie.options || {}
    const domain = this.getCookieDomain()
    const parts = [`${cookie.name}=${encodeURIComponent(cookie.value)}`]

    if (options.maxAge !== undefined) parts.push(`Max-Age=${options.maxAge}`)
    if (options.path) parts.push(`Path=${options.path}`)
    parts.push(`Domain=${domain}`)
    if (options.httpOnly) parts.push("HttpOnly")
    if (options.secure) parts.push("Secure")
    if (options.sameSite) parts.push(`SameSite=${this.formatSameSite(options.sameSite)}`)

    return parts.join("; ")
  }

  private getCookieDomain(): string {
    const hostname = new URL(this.config.origin).hostname
    const parts = hostname.split(".").filter(Boolean)

    if (parts.length < 2) {
      throw new Error("VAR_HTTP_ORIGIN должен содержать hostname, из которого можно вычислить cookie domain второго уровня")
    }

    return `.${parts.slice(-2).join(".")}`
  }

  private formatSameSite(value: iContracts.iCookieOptions["sameSite"]): string {
    if (value === "strict") return "Strict"
    if (value === "lax") return "Lax"
    return "None"
  }
}
