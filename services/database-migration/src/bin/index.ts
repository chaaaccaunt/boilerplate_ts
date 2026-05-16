import { Database } from "@/database"
import { getRequiredDatabaseConfig, Logger } from "@/libs"
import { DatabaseMigrationService } from "@/services/DatabaseMigrationService"

const logger = new Logger()
const database = new Database(getRequiredDatabaseConfig())
const migrationService = new DatabaseMigrationService(database.sequelize)

start().catch((error) => {
  logger.error("Не удалось выполнить миграции базы данных", { error })
  process.exit(1)
})

function start(): Promise<void> {
  logger.info("Запуск миграций базы данных")

  return database.sequelize.authenticate()
    .then(() => migrationService.migrate())
    .then(() => database.sequelize.close())
    .then(() => {
      logger.info("Миграции базы данных выполнены")
    })
    .catch((error) => database.sequelize.close()
      .catch((closeError) => {
        logger.error("Не удалось закрыть подключение к базе данных после ошибки миграции", { error: closeError })
      })
      .then(() => Promise.reject(error)))
}

export interface iDefaultEnvs { }
