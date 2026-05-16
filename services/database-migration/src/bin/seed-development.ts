import { Sequelize } from "sequelize"
import { getRequiredDatabaseConfig, Logger } from "@/libs"

const logger = new Logger()
const sequelize = new Sequelize(getRequiredDatabaseConfig())

const administratorRoleUid = "00000000-0000-4000-8000-000000000101"
const developmentAdministratorUserUid = "00000000-0000-4000-8000-000000000201"
const developmentAdministratorUserRoleUid = "00000000-0000-4000-8000-000000000301"
const developmentAdministratorPasswordHash = "$2b$10$9Srrg0qhRsHjC5YFbw8wYukfownKqxKgtF48VDErFBeXBpTfR9ixK"

seedDevelopmentData()
  .then(() => {
    logger.info("Development seed выполнен")
  })
  .catch((error) => {
    logger.error("Не удалось выполнить development seed", { error })
    process.exit(1)
  })

function seedDevelopmentData(): Promise<void> {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Development seed запрещен в production-среде")
  }

  return sequelize.authenticate()
    .then(() => sequelize.transaction((transaction) => sequelize.query(`
      INSERT INTO \`users\` (
        \`uid\`,
        \`login\`,
        \`password\`,
        \`firstName\`,
        \`lastName\`,
        \`surname\`,
        \`createdAt\`,
        \`updatedAt\`
      )
      VALUES (
        ?,
        'admin@example.com',
        ?,
        'Admin',
        'User',
        NULL,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )
      ON DUPLICATE KEY UPDATE
        \`password\` = VALUES(\`password\`),
        \`firstName\` = VALUES(\`firstName\`),
        \`lastName\` = VALUES(\`lastName\`),
        \`surname\` = VALUES(\`surname\`),
        \`deletedAt\` = NULL,
        \`updatedAt\` = CURRENT_TIMESTAMP
    `, {
      replacements: [developmentAdministratorUserUid, developmentAdministratorPasswordHash],
      transaction
    })
      .then(() => sequelize.query(`
        INSERT INTO \`user_roles\` (
          \`uid\`,
          \`userUid\`,
          \`roleUid\`,
          \`createdAt\`,
          \`updatedAt\`
        )
        VALUES (
          ?,
          ?,
          ?,
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        )
        ON DUPLICATE KEY UPDATE
          \`deletedAt\` = NULL,
          \`updatedAt\` = CURRENT_TIMESTAMP
      `, {
        replacements: [developmentAdministratorUserRoleUid, developmentAdministratorUserUid, administratorRoleUid],
        transaction
      }))))
    .then(() => sequelize.close())
    .catch((error) => sequelize.close()
      .catch(() => undefined)
      .then(() => Promise.reject(error)))
}
