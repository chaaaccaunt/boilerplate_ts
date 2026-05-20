import { ServerResponse } from "http"
import { createReadStream, statSync } from "fs"
import type { iHTTPConfig } from "."

interface FileRange {
  start: number
  end: number
  size: number
}

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

  sendPreflight(response: ServerResponse): void {
    response.statusCode = 204
    this.setCorsHeaders(response)
    response.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS")
    response.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization")
    response.setHeader("Access-Control-Max-Age", "86400")
    response.end()
  }

  sendFile(response: ServerResponse, result: iContracts.iFileControllerResult): void {
    this.setCorsHeaders(response)
    const range = this.getFileRange(result.file.path, result.file.range)
    if (range === null) {
      this.sendRangeNotSatisfiable(response, result.file.path)
      return
    }

    response.statusCode = range ? 206 : 200
    response.setHeader("Content-Type", result.file.mimeType)
    response.setHeader("X-Content-Type-Options", "nosniff")
    response.setHeader("Accept-Ranges", "bytes")
    response.setHeader("Content-Disposition", this.getContentDisposition(result.file.originalName, result.file.disposition || "attachment"))

    if (range) {
      response.setHeader("Content-Length", range.end - range.start + 1)
      response.setHeader("Content-Range", `bytes ${range.start}-${range.end}/${range.size}`)
    } else {
      response.setHeader("Content-Length", statSync(result.file.path).size)
    }

    createReadStream(result.file.path, range ? { start: range.start, end: range.end } : undefined)
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
    response.setHeader("X-Content-Type-Options", "nosniff")
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

  private getFileRange(path: string, rangeHeader?: string): FileRange | undefined | null {
    if (!rangeHeader) return undefined

    const size = statSync(path).size
    const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader)
    if (!match) return null

    const [, startValue, endValue] = match
    if (!startValue && !endValue) return null

    const requestedStart = startValue ? Number(startValue) : null
    const requestedEnd = endValue ? Number(endValue) : null

    if ((requestedStart !== null && !Number.isSafeInteger(requestedStart)) || (requestedEnd !== null && !Number.isSafeInteger(requestedEnd))) {
      return null
    }

    if (requestedStart === null) {
      const suffixLength = requestedEnd || 0
      if (suffixLength <= 0) return null

      return {
        start: Math.max(size - suffixLength, 0),
        end: size - 1,
        size
      }
    }

    const start = requestedStart
    const end = requestedEnd === null ? size - 1 : requestedEnd
    if (start < 0 || end < start || start >= size) return null

    return {
      start,
      end: Math.min(end, size - 1),
      size
    }
  }

  private sendRangeNotSatisfiable(response: ServerResponse, path: string): void {
    const size = statSync(path).size
    response.statusCode = 416
    this.setCorsHeaders(response)
    response.setHeader("Content-Range", `bytes */${size}`)
    response.setHeader("Accept-Ranges", "bytes")
    response.end()
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
    if (domain) parts.push(`Domain=${domain}`)
    if (options.httpOnly) parts.push("HttpOnly")
    if (options.secure) parts.push("Secure")
    if (options.sameSite) parts.push(`SameSite=${this.formatSameSite(options.sameSite)}`)

    return parts.join("; ")
  }

  private getCookieDomain(): string | null {
    const domain = this.config.public_user_cookie_domain

    if (!domain || domain === "УкажитеЗначение") {
      throw new Error("Не задана обязательная переменная окружения VAR_HTTP_PUBLIC_USER_COOKIE_DOMAIN")
    }

    if (domain === "host-only") {
      if (this.config.allowHostOnlyCookies) return null
      throw new Error("Host-only cookies разрешены только при VAR_HTTP_ALLOW_HOST_ONLY_COOKIES=true")
    }

    if (!/^\.[A-Za-z0-9.-]+$/.test(domain)) {
      throw new Error("VAR_HTTP_PUBLIC_USER_COOKIE_DOMAIN должен быть domain с ведущей точкой или значением host-only")
    }

    return domain
  }

  private formatSameSite(value: iContracts.iCookieOptions["sameSite"]): string {
    if (value === "strict") return "Strict"
    if (value === "lax") return "Lax"
    return "None"
  }
}
