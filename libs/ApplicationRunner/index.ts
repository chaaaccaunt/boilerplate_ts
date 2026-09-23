import { Logger } from "../Logger"
import { iProcessClusterConfig, ProcessCluster } from "../ProcessCluster"

export interface iApplicationRunnerOptions {
  applicationName: string
  application: new () => iApplication
  processConfig?: iProcessClusterConfig
  createLogger?: () => Logger
}

export interface iApplication {
  start(): void | Promise<void>
}

export class ApplicationRunner {
  static run(options: iApplicationRunnerOptions): void {
    const startApplication = (): void | Promise<void> => new options.application().start()
    const handleFatalError = (error: unknown): void => {
      const logger = options.createLogger ? options.createLogger() : new Logger()
      logger.error(`Не удалось запустить ${options.applicationName}`, {
        error: error instanceof Error ? error : String(error)
      })
    }

    if (options.processConfig) {
      ProcessCluster.run(options.processConfig, startApplication, handleFatalError)
      return
    }

    Promise.resolve()
      .then(() => startApplication())
      .catch((error) => {
        handleFatalError(error)
        process.exit(1)
      })
  }
}
