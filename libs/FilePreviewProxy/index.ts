import { spawn } from "child_process"
import { constants } from "fs"
import { access, mkdir } from "fs/promises"
import { dirname, resolve } from "path"

interface PreviewProxyOptions {
  sourcePath: string
  targetPath: string
  mimeType: string
}

interface PreviewProxyResult {
  created: boolean
  path: string
}


export class FilePreviewProxy {
  private readonly supportedMimeTypePattern = /^(image|video)\//
  private readonly ffmpegPath = resolve(__dirname, "ffmpeg", "lgpl", "bin", "ffmpeg.exe")

  create(options: PreviewProxyOptions): Promise<PreviewProxyResult | null> {
    if (!this.supports(options.mimeType)) {
      return Promise.resolve(null)
    }

    return this.ensureFfmpegAvailable()
      .then(() => mkdir(dirname(options.targetPath), { recursive: true }))
      .then(() => this.runFfmpeg(options.sourcePath, options.targetPath))
      .then(() => ({
        created: true,
        path: options.targetPath
      }))
  }

  supports(mimeType: string): boolean {
    return this.supportedMimeTypePattern.test(mimeType)
  }

  private ensureFfmpegAvailable(): Promise<void> {
    return access(this.ffmpegPath, constants.X_OK)
  }

  private runFfmpeg(sourcePath: string, targetPath: string): Promise<void> {
    const args = [
      "-y",
      "-hide_banner",
      "-loglevel",
      "error",
      "-i",
      sourcePath,
      "-frames:v",
      "1",
      "-vf",
      "scale=320:-2:force_original_aspect_ratio=decrease",
      "-f",
      "image2",
      targetPath
    ]

    return new Promise((resolvePromise, rejectPromise) => {
      const process = spawn(this.ffmpegPath, args, {
        windowsHide: true
      })
      const errorChunks: Buffer[] = []

      process.stderr.on("data", (chunk: Buffer) => errorChunks.push(chunk))
      process.on("error", (error) => rejectPromise(error))
      process.on("close", (code) => {
        if (code === 0) {
          resolvePromise()
          return
        }

        const errorMessage = Buffer.concat(errorChunks).toString("utf8").trim()
        rejectPromise(new Error(errorMessage || `ffmpeg завершился с кодом ${code}`))
      })
    })
  }
}
