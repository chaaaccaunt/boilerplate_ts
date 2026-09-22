import { createWriteStream } from "fs"
import { readFile } from "fs/promises"
import { once } from "events"
import { Exceptions } from "@/libs"

export interface ZipSourceEntry {
  name: string
  contentPath: string
  size: number
  date: Date
}

interface ZipCentralDirectoryEntry {
  name: string
  date: Date
  offset: number
  crc32: number
  size: number
}

const MAX_ZIP_UINT32 = 0xffffffff
const CRC32_TABLE = Array.from({ length: 256 }, (_, index) => {
  let value = index
  for (let bit = 0; bit < 8; bit++) value = (value & 1) ? (0xedb88320 ^ (value >>> 1)) : (value >>> 1)
  return value >>> 0
})

export class ZipArchiveWriter {
  write(path: string, entries: ZipSourceEntry[]): Promise<void> {
    const stream = createWriteStream(path)
    const centralDirectoryEntries: ZipCentralDirectoryEntry[] = []
    let streamError: Error | null = null
    let offset = 0

    stream.on("error", (error) => { streamError = error })

    return entries.reduce<Promise<void>>((previous, entry) => previous
      .then(() => readFile(entry.contentPath))
      .then((content) => {
        const crc32 = this.getCrc32(content)
        const localHeader = this.createLocalHeader(entry, crc32, content.length)
        centralDirectoryEntries.push({ name: entry.name, date: entry.date, offset, crc32, size: content.length })
        offset += localHeader.length + content.length
        this.assertSize(offset)
        return this.writeBuffer(stream, localHeader).then(() => this.writeBuffer(stream, content))
      }), Promise.resolve())
      .then(() => {
        const directoryOffset = offset
        const parts = centralDirectoryEntries.map((entry) => this.createCentralDirectoryEntry(entry))
        const directorySize = parts.reduce((sum, part) => sum + part.length, 0)
        const end = this.createEndOfCentralDirectory(entries.length, directorySize, directoryOffset)
        return parts.reduce<Promise<void>>((previous, part) => previous.then(() => this.writeBuffer(stream, part)), Promise.resolve())
          .then(() => this.writeBuffer(stream, end))
      })
      .then(() => new Promise<void>((resolvePromise, rejectPromise) => {
        stream.end(() => streamError ? rejectPromise(streamError) : resolvePromise())
      }))
      .catch((error) => {
        stream.destroy()
        throw error
      })
  }

  private writeBuffer(stream: ReturnType<typeof createWriteStream>, content: Buffer): Promise<void> {
    if (stream.write(content)) return Promise.resolve()
    return Promise.race([
      once(stream, "drain").then(() => undefined),
      once(stream, "error").then(([error]) => { throw error })
    ])
  }

  private createLocalHeader(entry: ZipSourceEntry, crc32: number, contentSize: number): Buffer {
    const name = Buffer.from(entry.name, "utf8")
    const header = Buffer.alloc(30 + name.length)
    const { dosTime, dosDate } = this.getDosDateTime(entry.date)
    this.assertSize(contentSize)
    header.writeUInt32LE(0x04034b50, 0)
    header.writeUInt16LE(20, 4)
    header.writeUInt16LE(0x0800, 6)
    header.writeUInt16LE(0, 8)
    header.writeUInt16LE(dosTime, 10)
    header.writeUInt16LE(dosDate, 12)
    header.writeUInt32LE(crc32, 14)
    header.writeUInt32LE(contentSize, 18)
    header.writeUInt32LE(contentSize, 22)
    header.writeUInt16LE(name.length, 26)
    header.writeUInt16LE(0, 28)
    name.copy(header, 30)
    return header
  }

  private createCentralDirectoryEntry(entry: ZipCentralDirectoryEntry): Buffer {
    const name = Buffer.from(entry.name, "utf8")
    const header = Buffer.alloc(46 + name.length)
    const { dosTime, dosDate } = this.getDosDateTime(entry.date)
    this.assertSize(entry.offset)
    header.writeUInt32LE(0x02014b50, 0)
    header.writeUInt16LE(20, 4)
    header.writeUInt16LE(20, 6)
    header.writeUInt16LE(0x0800, 8)
    header.writeUInt16LE(0, 10)
    header.writeUInt16LE(dosTime, 12)
    header.writeUInt16LE(dosDate, 14)
    header.writeUInt32LE(entry.crc32, 16)
    header.writeUInt32LE(entry.size, 20)
    header.writeUInt32LE(entry.size, 24)
    header.writeUInt16LE(name.length, 28)
    header.writeUInt32LE(entry.offset, 42)
    name.copy(header, 46)
    return header
  }

  private createEndOfCentralDirectory(entriesCount: number, size: number, offset: number): Buffer {
    if (entriesCount > 0xffff) throw new Exceptions.ServiceError.ConflictError("Слишком много файлов для одного архива")
    this.assertSize(size)
    this.assertSize(offset)
    const header = Buffer.alloc(22)
    header.writeUInt32LE(0x06054b50, 0)
    header.writeUInt16LE(entriesCount, 8)
    header.writeUInt16LE(entriesCount, 10)
    header.writeUInt32LE(size, 12)
    header.writeUInt32LE(offset, 16)
    return header
  }

  private getCrc32(content: Buffer): number {
    let crc = 0xffffffff
    for (const byte of content) crc = CRC32_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8)
    return (crc ^ 0xffffffff) >>> 0
  }

  private getDosDateTime(date: Date): { dosTime: number, dosDate: number } {
    const year = Math.max(date.getFullYear(), 1980)
    return {
      dosTime: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
      dosDate: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate()
    }
  }

  private assertSize(value: number): void {
    if (value > MAX_ZIP_UINT32) throw new Exceptions.ServiceError.ConflictError("Архив слишком большой")
  }
}
