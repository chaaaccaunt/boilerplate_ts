import { Sequelize } from "sequelize"
import { getRequiredDatabaseConfig, Logger } from "@/libs"
import { DevelopmentSeedService } from "../services/DevelopmentSeedService"
import { MockDataSeedService } from "../services/MockDataSeedService"

const logger = new Logger()
const sequelize = new Sequelize(getRequiredDatabaseConfig())
const seedService = new DevelopmentSeedService(sequelize)
const mockDataSeedService = new MockDataSeedService(sequelize)

sequelize.authenticate()
  .then(() => seedService.seed())
  .then(() => process.env.VAR_DB_GENERATE_MOCK_DATA === "true" ? mockDataSeedService.seed() : undefined)
  .then(() => sequelize.close())
  .then(() => {
    logger.info("Development seed выполнен")
  })
  .catch((error) => sequelize.close()
    .catch(() => undefined)
    .then(() => {
      logger.error("Не удалось выполнить development seed", { error })
      process.exit(1)
    }))
