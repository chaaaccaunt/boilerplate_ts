import { Sequelize } from "sequelize"
import { getRequiredDatabaseConfig, Logger } from "@/libs"

const logger = new Logger()
const sequelize = new Sequelize(getRequiredDatabaseConfig())

const superadministratorRoleUid = "00000000-0000-4000-8000-000000000101"
const developmentSuperadministratorUserUid = "00000000-0000-4000-8000-000000000201"
const developmentSuperadministratorUserRoleUid = "00000000-0000-4000-8000-000000000301"
const developmentSuperadministratorPasswordHash = "$2b$10$9Srrg0qhRsHjC5YFbw8wYukfownKqxKgtF48VDErFBeXBpTfR9ixK"

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
    .then(() => sequelize.transaction((transaction) => sequelize.query(getUpsertSuperadministratorUserSql(), {
      replacements: [developmentSuperadministratorUserUid, developmentSuperadministratorPasswordHash],
      transaction
    })
      .then(() => sequelize.query(getUpsertSuperadministratorUserRoleSql(), {
        replacements: [developmentSuperadministratorUserRoleUid, developmentSuperadministratorUserUid, superadministratorRoleUid],
        transaction
      }))))
    .then(() => sequelize.close())
    .catch((error) => sequelize.close()
      .catch(() => undefined)
      .then(() => Promise.reject(error)))
}

function getUpsertSuperadministratorUserSql(): string {
  if (sequelize.getDialect() === "postgres") {
    return `
      INSERT INTO "users" (
        "uid",
        "login",
        "password",
        "firstName",
        "lastName",
        "surname",
        "createdAt",
        "updatedAt"
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
      ON CONFLICT ("login") DO UPDATE SET
        "password" = EXCLUDED."password",
        "firstName" = EXCLUDED."firstName",
        "lastName" = EXCLUDED."lastName",
        "surname" = EXCLUDED."surname",
        "deletedAt" = NULL,
        "updatedAt" = CURRENT_TIMESTAMP
    `
  }

  return `
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
    `
}

function getUpsertSuperadministratorUserRoleSql(): string {
  if (sequelize.getDialect() === "postgres") {
    return `
      INSERT INTO "user_roles" (
        "uid",
        "userUid",
        "roleUid",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        ?,
        ?,
        ?,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )
      ON CONFLICT ("userUid", "roleUid") DO UPDATE SET
        "deletedAt" = NULL,
        "updatedAt" = CURRENT_TIMESTAMP
    `
  }

  return `
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
      `
}
