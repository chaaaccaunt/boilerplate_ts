import { createServer, Server, Socket } from "net"
import { Logger } from "@/libs"
import { LogCollectorService } from "./LogCollectorService"

export class LogCollectorSocketServer {
  private readonly server: Server
  private readonly shouldPrintCollectedLogs = process.env.NODE_ENV !== "production"

  constructor(
    private readonly port: string,
    private readonly service: LogCollectorService,
    private readonly logger = new Logger()
  ) {
    this.server = createServer((socket) => this.handleConnection(socket))
  }

  listen(): void {
    this.server.listen(this.normalizePort(this.port), () => {
      this.logger.info("Log collector socket server запущен", {
        serviceName: this.constructor.name,
        serviceMethod: "listen",
        status: this.normalizePort(this.port)
      })
    })
  }

  private handleConnection(socket: Socket): void {
    socket.setEncoding("utf8")
    let buffer = ""

    socket.on("data", (chunk) => {
      buffer += chunk
      const lines = buffer.split("\n")
      buffer = lines.pop() || ""

      lines
        .map((line) => line.trim())
        .filter(Boolean)
        .forEach((line) => this.handleLine(line))
    })
  }

  private handleLine(line: string): void {
    Promise.resolve()
      .then(() => JSON.parse(line) as iSharedLogs.CollectLogPayloadDto)
      .then((payload) => {
        this.printCollectedLog(payload)
        return this.service.collect(payload)
      })
      .catch((error) => {
        this.logger.warn("Не удалось сохранить log record", {
          serviceName: this.constructor.name,
          serviceMethod: "handleLine",
          error
        })
      })
  }

  private printCollectedLog(payload: iSharedLogs.CollectLogPayloadDto): void {
    if (!this.shouldPrintCollectedLogs) return

    console.log({
      timestamp: payload.timestamp,
      level: payload.level,
      source: payload.source,
      message: payload.message,
      context: payload.context
    })
  }

  private normalizePort(value: string): number {
    const port = Number(value)
    if (!Number.isSafeInteger(port) || port <= 0) {
      throw new Error("VAR_LOG_COLLECTOR_SOCKET_PORT должен быть положительным числом")
    }

    return port
  }
}
