import { IncomingMessage } from "http"
import { randomUUID } from "crypto"
import { createWriteStream } from "fs"
import { mkdir, unlink } from "fs/promises"
import { join } from "path"
import busboy from "busboy"
import { Exceptions } from "../Exceptions"

export class HTTPRequestBodyParser {
  constructor(
    private readonly exceptions: typeof Exceptions.HttpServerError,
    private readonly jsonRequestBodyLimit: number,
    private readonly multipartRequestBodyLimit: number
  ) { }

  readBody(request: IncomingMessage, limit: number): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const bodyChunks: Buffer[] = []
      let bodySize = 0
      let completed = false

      const cleanup = () => {
        request.off("data", onData)
        request.off("end", onEnd)
        request.off("error", onError)
      }

      const fail = (error: Error) => {
        if (completed) return
        completed = true
        cleanup()
        request.resume()
        reject(error)
      }

      const onData = (chunk: Buffer) => {
        bodySize += chunk.length

        if (bodySize > limit) {
          fail(new this.exceptions.BadRequestError("Размер тела запроса превышает допустимый лимит"))
          return
        }

        bodyChunks.push(chunk)
      }

      const onEnd = () => {
        if (completed) return
        completed = true
        cleanup()
        resolve(bodySize ? Buffer.concat(bodyChunks, bodySize) : Buffer.from([]))
      }

      const onError = (error: Error) => {
        fail(new this.exceptions.BadRequestError("Не удалось прочитать тело запроса", { cause: error }))
      }

      request.on("data", onData)
      request.on("end", onEnd)
      request.on("error", onError)
    })
  }

  parseJsonBody(body: Buffer): iContracts.iPayload {
    try {
      const parsed = JSON.parse(body.toString())
      if (!this.isPayload(parsed)) {
        throw new this.exceptions.BadRequestError("Некорректные данные запроса")
      }

      return parsed
    } catch (error) {
      if (error instanceof this.exceptions.BadRequestError) throw error
      throw new this.exceptions.BadRequestError("Некорректные данные запроса", { cause: error })
    }
  }

  parseMultipartRequest(request: IncomingMessage): Promise<iContracts.iMultipartPayload> {
    return new Promise((resolve, reject) => {
      const fields: iContracts.iPayload = {}
      const files: iContracts.iUploadedFile[] = []
      const writtenFilePaths: string[] = []
      const fileTasks: Promise<void>[] = []
      let totalSize = 0
      let completed = false
      let parser: busboy.Busboy

      const fail = (error: Error) => {
        if (completed) return
        completed = true
        request.unpipe(parser)
        request.resume()
        parser.destroy(error)
        this.cleanupFilePaths(writtenFilePaths)
          .finally(() => reject(error))
      }

      try {
        parser = busboy({
          headers: request.headers,
          defParamCharset: "utf8",
          limits: {
            fileSize: this.multipartRequestBodyLimit,
            fieldSize: this.jsonRequestBodyLimit,
            fields: 100,
            files: 20,
            parts: 120
          }
        })
      } catch (error) {
        reject(new this.exceptions.BadRequestError("Некорректный multipart-запрос", { cause: error }))
        return
      }

      parser.on("field", (name, value) => this.addMultipartField(fields, name, value))
      parser.on("file", (fieldName, file, info) => {
        if (!info.filename) {
          file.resume()
          fail(new this.exceptions.BadRequestError("Имя файла отсутствует"))
          return
        }

        const fileTask = this.writeUploadedFile(request, fieldName, file, info, writtenFilePaths, (chunkSize) => {
          totalSize += chunkSize

          if (totalSize > this.multipartRequestBodyLimit) {
            throw new this.exceptions.BadRequestError("Размер файлов превышает допустимый лимит")
          }
        })
          .then((uploadedFile) => {
            files.push(uploadedFile)
          })
          .catch((error) => {
            fail(error instanceof Error ? error : new this.exceptions.BadRequestError("Не удалось сохранить файл", { cause: error }))
          })

        fileTasks.push(fileTask)
      })

      parser.on("fieldsLimit", () => fail(new this.exceptions.BadRequestError("Количество полей превышает допустимый лимит")))
      parser.on("filesLimit", () => fail(new this.exceptions.BadRequestError("Количество файлов превышает допустимый лимит")))
      parser.on("partsLimit", () => fail(new this.exceptions.BadRequestError("Количество частей запроса превышает допустимый лимит")))
      parser.on("error", (error) => fail(new this.exceptions.BadRequestError("Не удалось обработать multipart-запрос", { cause: error })))
      parser.on("close", () => {
        if (completed) return

        Promise.all(fileTasks)
          .then(() => {
            if (completed) return
            completed = true
            resolve({ fields, files })
          })
          .catch((error) => {
            fail(error instanceof Error ? error : new this.exceptions.BadRequestError("Не удалось обработать multipart-запрос", { cause: error }))
          })
      })

      request.pipe(parser)
    })
  }

  cleanupUploadedFiles(files: iContracts.iUploadedFile[]): Promise<void[]> {
    return Promise.all(files.map((file) => this.removeFile(join(process.cwd(), "uploads", file.storagePath, "content"))))
  }

  private cleanupFilePaths(paths: string[]): Promise<void[]> {
    return Promise.all(paths.map((path) => this.removeFile(path)))
  }

  private removeFile(path: string): Promise<void> {
    return unlink(path).catch(() => undefined)
  }

  private addMultipartField(fields: iContracts.iPayload, name: string, value: string): void {
    const current = fields[name]

    if (current === undefined) {
      fields[name] = value
      return
    }

    if (Array.isArray(current)) {
      current.push(value)
      return
    }

    fields[name] = [current, value]
  }

  private writeUploadedFile(
    request: IncomingMessage,
    fieldName: string,
    file: NodeJS.ReadableStream & { truncated?: boolean },
    info: { filename: string, encoding: string, mimeType: string },
    writtenFilePaths: string[],
    registerChunk: (chunkSize: number) => void
  ): Promise<iContracts.iUploadedFile> {
    if (!request.user) {
      file.resume()
      return Promise.reject(new this.exceptions.UnauthorizedError())
    }

    const now = new Date()
    const fileUid = randomUUID()
    const relativePathParts = [
      String(now.getFullYear()),
      String(now.getMonth() + 1).padStart(2, "0"),
      String(now.getDate()).padStart(2, "0"),
      fileUid
    ]
    const storagePath = relativePathParts.join("/")
    const directoryPath = join(process.cwd(), "uploads", ...relativePathParts)
    const targetPath = join(directoryPath, "content")

    return mkdir(directoryPath, { recursive: true })
      .then(() => new Promise<iContracts.iUploadedFile>((resolve, reject) => {
        let size = 0
        const output = createWriteStream(targetPath, { flags: "wx" })
        writtenFilePaths.push(targetPath)

        const fail = (error: Error) => {
          output.destroy()
          reject(error)
        }

        file.on("data", (chunk: Buffer) => {
          size += chunk.length

          try {
            registerChunk(chunk.length)
          } catch (error) {
            file.unpipe(output)
            fail(error instanceof Error ? error : new this.exceptions.BadRequestError("Размер файлов превышает допустимый лимит", { cause: error }))
          }
        })

        file.on("limit", () => fail(new this.exceptions.BadRequestError("Размер файла превышает допустимый лимит")))
        file.on("error", (error) => fail(new this.exceptions.BadRequestError("Не удалось прочитать файл", { cause: error })))
        output.on("error", (error) => reject(new this.exceptions.InternalServerError("Не удалось сохранить файл", { cause: error })))
        output.on("finish", () => {
          if (file.truncated) {
            reject(new this.exceptions.BadRequestError("Размер файла превышает допустимый лимит"))
            return
          }

          resolve({
            fieldName,
            originalName: info.filename,
            mimeType: info.mimeType,
            encoding: info.encoding,
            size,
            storagePath
          })
        })

        file.pipe(output)
      }))
  }

  private isPayload(value: unknown): value is iContracts.iPayload {
    return typeof value === "object" && value !== null && !Array.isArray(value)
  }
}
