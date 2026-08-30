import cluster from "cluster"
import { availableParallelism } from "os"

export interface iProcessClusterConfig {
  enabled: boolean
  workers: "auto" | number
}

type ApplicationStarter = () => void | Promise<void>
type FatalErrorHandler = (error: unknown) => void

export class ProcessCluster {
  private static readonly restartWindowMs = 60_000
  private static readonly maxRestartsPerWorker = 5
  private static readonly shutdownTimeoutMs = 10_000

  static run(config: iProcessClusterConfig, startApplication: ApplicationStarter, handleFatalError: FatalErrorHandler = this.handleFatalError): void {
    if (!config.enabled || cluster.isWorker) {
      Promise.resolve()
        .then(() => startApplication())
        .catch((error) => {
          handleFatalError(error)
          process.exit(1)
        })
      return
    }

    this.runPrimary(config)
  }

  private static runPrimary(config: iProcessClusterConfig): void {
    const workerCount = config.workers === "auto" ? availableParallelism() : config.workers
    const restartTimestamps: number[] = []
    let shuttingDown = false

    const forkWorker = () => cluster.fork()
    const shutdown = (signal: NodeJS.Signals) => {
      if (shuttingDown) return
      shuttingDown = true

      const timeout = setTimeout(() => {
        Object.values(cluster.workers || {}).forEach((worker) => worker?.process.kill("SIGKILL"))
      }, this.shutdownTimeoutMs)
      timeout.unref()

      const workers = Object.values(cluster.workers || {}).filter((worker) => Boolean(worker))
      if (!workers.length) {
        clearTimeout(timeout)
        process.exit(process.exitCode || 0)
      }

      let remainingWorkers = workers.length
      workers.forEach((worker) => {
        worker?.once("exit", () => {
          remainingWorkers -= 1
          if (remainingWorkers > 0) return
          clearTimeout(timeout)
          process.exit(process.exitCode || 0)
        })
        worker?.process.kill(signal)
      })
    }

    process.once("SIGINT", () => shutdown("SIGINT"))
    process.once("SIGTERM", () => shutdown("SIGTERM"))

    cluster.on("exit", (_worker, code, signal) => {
      if (shuttingDown) return

      const now = Date.now()
      restartTimestamps.push(now)
      while (restartTimestamps[0] && now - restartTimestamps[0] > this.restartWindowMs) {
        restartTimestamps.shift()
      }

      if (restartTimestamps.length > workerCount * this.maxRestartsPerWorker) {
        console.error(`Превышен лимит перезапусков cluster workers; последний exit: code=${code}, signal=${signal || "none"}`)
        process.exitCode = 1
        shutdown("SIGTERM")
        return
      }

      forkWorker()
    })

    for (let index = 0; index < workerCount; index += 1) {
      forkWorker()
    }
  }

  private static handleFatalError(error: unknown): void {
    console.error(error instanceof Error ? error.stack || error.message : String(error))
  }
}
