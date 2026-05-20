import { Sequelize } from "sequelize"
import mysql2 from "mysql2"
import * as postgresDriver from "pg"
import type { Options } from "sequelize"

export interface DatabaseSetupConfig {
  databaseDialect: string
  databaseHost: string
  databasePort?: string
  databaseName: string
  serviceUserName: string
  serviceUserPassword: string
  serviceUserHost: string
  serviceUserGrants: string[]
  runtimeUsers: DatabaseRuntimeUserConfig[]
  adminUserName: string
  adminUserPassword: string
}

export interface DatabaseRuntimeUserConfig {
  userName: string
  password: string
  host: string
  grants: DatabaseRuntimeUserGrant[]
}

export interface DatabaseRuntimeUserGrant {
  table: string
  operations: string[]
}

const allowedGrantNames = new Set([
  "SELECT",
  "INSERT",
  "UPDATE",
  "DELETE",
  "CREATE",
  "ALTER",
  "DROP",
  "INDEX",
  "REFERENCES"
])

export class DatabaseSetupService {
  private readonly sequelize: Sequelize
  private readonly dialect: "mysql" | "postgres"
  private readonly databasePort?: number

  constructor(private readonly config: DatabaseSetupConfig) {
    this.dialect = this.getSupportedDialect(config.databaseDialect)
    this.databasePort = this.getDatabasePort(config.databasePort)
    this.sequelize = new Sequelize({
      host: config.databaseHost,
      username: config.adminUserName,
      password: config.adminUserPassword,
      port: this.databasePort,
      database: this.getAdminConnectionDatabase(),
      dialect: this.dialect,
      dialectModule: this.getDialectModule(),
      logging: false
    })
  }

  setup(): Promise<void> {
    this.validateConfig()

    return this.sequelize.authenticate()
      .then(() => this.createServiceUser())
      .then(() => this.createDatabase())
      .then(() => this.revokeUserPermissions(this.config.serviceUserName, this.config.serviceUserHost))
      .then(() => this.grantServiceUserPermissions())
      .then(() => this.sequelize.close())
      .catch((error) => this.sequelize.close()
        .catch(() => undefined)
        .then(() => Promise.reject(error)))
  }

  setupRuntimeGrants(): Promise<void> {
    this.validateRuntimeUsersConfig()

    return this.sequelize.authenticate()
      .then(() => this.createRuntimeUsers())
      .then(() => this.sequelize.close())
      .catch((error) => this.sequelize.close()
        .catch(() => undefined)
        .then(() => Promise.reject(error)))
  }

  dropDevelopmentDatabase(): Promise<void> {
    this.assertDevelopmentMode()
    this.validateDropConfig()

    return this.sequelize.authenticate()
      .then(() => this.dropDatabase())
      .then(() => this.sequelize.close())
      .catch((error) => this.sequelize.close()
        .catch(() => undefined)
        .then(() => Promise.reject(error)))
  }

  private createDatabase(): Promise<unknown> {
    if (this.dialect === "postgres") {
      return this.sequelize.query("SELECT 1 FROM pg_database WHERE datname = ?", {
        replacements: [this.config.databaseName]
      })
        .then(([rows]) => {
          if (Array.isArray(rows) && rows.length > 0) return undefined

          return this.sequelize.query(`CREATE DATABASE ${this.quoteIdentifier(this.config.databaseName)} OWNER ${this.quoteIdentifier(this.config.serviceUserName)}`)
        })
    }

    return this.sequelize.query(`CREATE DATABASE IF NOT EXISTS ${this.quoteIdentifier(this.config.databaseName)} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`)
  }

  private dropDatabase(): Promise<unknown> {
    if (this.dialect === "postgres") {
      return this.sequelize.query(`
        SELECT pg_terminate_backend(pid)
        FROM pg_stat_activity
        WHERE datname = ?
          AND pid <> pg_backend_pid()
      `, {
        replacements: [this.config.databaseName]
      })
        .then(() => this.sequelize.query(`DROP DATABASE IF EXISTS ${this.quoteIdentifier(this.config.databaseName)}`))
    }

    return this.sequelize.query(`DROP DATABASE IF EXISTS ${this.quoteIdentifier(this.config.databaseName)}`)
  }

  private createServiceUser(): Promise<unknown> {
    if (this.dialect === "postgres") {
      return this.createPostgresRole(this.config.serviceUserName, this.config.serviceUserPassword)
    }

    return this.sequelize.query(
      `CREATE USER IF NOT EXISTS ${this.quoteString(this.config.serviceUserName)}@${this.quoteString(this.config.serviceUserHost)} IDENTIFIED BY ${this.quoteString(this.config.serviceUserPassword)}`
    )
  }

  private grantServiceUserPermissions(): Promise<unknown> {
    if (this.dialect === "postgres") {
      const targetDatabase = this.createSequelize(this.config.databaseName)

      return this.sequelize.query(`GRANT ALL PRIVILEGES ON DATABASE ${this.quoteIdentifier(this.config.databaseName)} TO ${this.quoteIdentifier(this.config.serviceUserName)}`)
        .then(() => targetDatabase.authenticate())
        .then(() => targetDatabase.query(`GRANT ALL PRIVILEGES ON SCHEMA public TO ${this.quoteIdentifier(this.config.serviceUserName)}`))
        .then(() => targetDatabase.close())
        .catch((error) => targetDatabase.close()
          .catch(() => undefined)
          .then(() => Promise.reject(error)))
    }

    return this.sequelize.query(
      `GRANT ${this.config.serviceUserGrants.join(", ")} ON ${this.quoteIdentifier(this.config.databaseName)}.* TO ${this.quoteString(this.config.serviceUserName)}@${this.quoteString(this.config.serviceUserHost)}`
    )
      .then(() => this.sequelize.query("FLUSH PRIVILEGES"))
  }

  private createRuntimeUsers(): Promise<void> {
    return this.config.runtimeUsers.reduce(
      (chain, runtimeUser) => chain
        .then(() => this.validateRuntimeUser(runtimeUser))
        .then(() => this.createRuntimeUser(runtimeUser))
        .then(() => this.revokeUserPermissions(runtimeUser.userName, runtimeUser.host))
        .then(() => this.grantRuntimeUserPermissions(runtimeUser)),
      Promise.resolve()
    )
  }

  private createRuntimeUser(runtimeUser: DatabaseRuntimeUserConfig): Promise<unknown> {
    if (this.dialect === "postgres") {
      return this.createPostgresRole(runtimeUser.userName, runtimeUser.password)
    }

    return this.sequelize.query(
      `CREATE USER IF NOT EXISTS ${this.quoteString(runtimeUser.userName)}@${this.quoteString(runtimeUser.host)} IDENTIFIED BY ${this.quoteString(runtimeUser.password)}`
    )
  }

  private revokeUserPermissions(userName: string, host: string): Promise<unknown> {
    if (this.dialect === "postgres") {
      const targetDatabase = this.createSequelize(this.config.databaseName)

      return this.sequelize.query(`REVOKE ALL PRIVILEGES ON DATABASE ${this.quoteIdentifier(this.config.databaseName)} FROM ${this.quoteIdentifier(userName)}`)
        .then(() => targetDatabase.authenticate())
        .then(() => targetDatabase.query(`REVOKE ALL PRIVILEGES ON SCHEMA public FROM ${this.quoteIdentifier(userName)}`))
        .then(() => targetDatabase.query(`REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM ${this.quoteIdentifier(userName)}`))
        .then(() => targetDatabase.close())
        .catch((error) => targetDatabase.close()
          .catch(() => undefined)
          .then(() => {
            if (this.isMissingTargetDatabaseError(error)) return undefined

            return Promise.reject(error)
          }))
    }

    return this.sequelize.query(
      `REVOKE ALL PRIVILEGES, GRANT OPTION FROM ${this.quoteString(userName)}@${this.quoteString(host)}`
    )
  }

  private grantRuntimeUserPermissions(runtimeUser: DatabaseRuntimeUserConfig): Promise<void> {
    if (this.dialect === "postgres") {
      const targetDatabase = this.createSequelize(this.config.databaseName)

      return this.sequelize.query(`GRANT CONNECT ON DATABASE ${this.quoteIdentifier(this.config.databaseName)} TO ${this.quoteIdentifier(runtimeUser.userName)}`)
        .then(() => targetDatabase.authenticate())
        .then(() => targetDatabase.query(`GRANT USAGE ON SCHEMA public TO ${this.quoteIdentifier(runtimeUser.userName)}`))
        .then(() => runtimeUser.grants.reduce(
          (chain, grant) => chain.then(() => {
            const operations = this.getPostgresGrantOperations(grant.operations)
            if (operations.length === 0) return undefined

            return targetDatabase.query(
              `GRANT ${operations.join(", ")} ON TABLE ${this.quoteIdentifier(grant.table)} TO ${this.quoteIdentifier(runtimeUser.userName)}`
            )
          }),
          Promise.resolve<unknown>(undefined)
        ))
        .then(() => targetDatabase.close())
        .catch((error) => targetDatabase.close()
          .catch(() => undefined)
          .then(() => Promise.reject(error)))
        .then(() => undefined)
    }

    return runtimeUser.grants.reduce(
      (chain, grant) => chain.then(() => this.sequelize.query(
        `GRANT ${grant.operations.join(", ")} ON ${this.quoteIdentifier(this.config.databaseName)}.${this.quoteIdentifier(grant.table)} TO ${this.quoteString(runtimeUser.userName)}@${this.quoteString(runtimeUser.host)}`
      )),
      Promise.resolve<unknown>(undefined)
    )
      .then(() => this.sequelize.query("FLUSH PRIVILEGES"))
      .then(() => undefined)
  }

  private validateConfig(): void {
    this.assertSupportedDialect()
    this.assertNotPlaceholder("VAR_DB_HOST", this.config.databaseHost)
    this.assertNotPlaceholder("VAR_DB_NAME", this.config.databaseName)
    this.assertNotPlaceholder("VAR_DB_USER", this.config.serviceUserName)
    this.assertNotPlaceholder("VAR_DB_PASSWORD", this.config.serviceUserPassword)
    this.assertNotPlaceholder("VAR_DB_ADMIN_USER", this.config.adminUserName)
    this.assertNotPlaceholder("VAR_DB_ADMIN_PASSWORD", this.config.adminUserPassword)
    this.assertNotPlaceholder("VAR_DB_SERVICE_HOST", this.config.serviceUserHost)

    if (!this.config.serviceUserGrants.length) {
      throw new Error("VAR_DB_SERVICE_GRANTS должен содержать хотя бы одно право")
    }

    this.config.serviceUserGrants.forEach((grantName) => {
      this.assertAllowedGrantName("VAR_DB_SERVICE_GRANTS", grantName)
    })

    this.validateRuntimeUsersConfig()
  }

  private validateRuntimeUsersConfig(): void {
    this.config.runtimeUsers.forEach((runtimeUser) => this.validateRuntimeUser(runtimeUser))
  }

  private validateRuntimeUser(runtimeUser: DatabaseRuntimeUserConfig): void {
    this.assertNotPlaceholder("VAR_DB_RUNTIME_GRANTS.userName", runtimeUser.userName)
    this.assertNotPlaceholder("VAR_DB_RUNTIME_GRANTS.password", runtimeUser.password)
    this.assertNotPlaceholder("VAR_DB_RUNTIME_GRANTS.host", runtimeUser.host)

    if (!runtimeUser.grants.length) {
      throw new Error(`Runtime database user должен иметь хотя бы один grant: ${runtimeUser.userName}`)
    }

    runtimeUser.grants.forEach((grant) => {
      this.quoteIdentifier(grant.table)

      if (!grant.operations.length) {
        throw new Error(`Runtime database grant должен иметь хотя бы одну operation: ${runtimeUser.userName}.${grant.table}`)
      }

      grant.operations.forEach((operation) => {
        this.assertAllowedGrantName(`VAR_DB_RUNTIME_GRANTS ${runtimeUser.userName}.${grant.table}`, operation)

        if (operation === "CREATE" || operation === "ALTER" || operation === "DROP") {
          throw new Error(`Runtime database user не может получать schema права: ${runtimeUser.userName}.${grant.table}.${operation}`)
        }
      })
    })
  }

  private assertAllowedGrantName(source: string, grantName: string): void {
    if (!allowedGrantNames.has(grantName)) {
      throw new Error(`Недопустимое право в ${source}: ${grantName}`)
    }
  }

  private validateDropConfig(): void {
    this.assertSupportedDialect()
    this.assertNotPlaceholder("VAR_DB_HOST", this.config.databaseHost)
    this.assertNotPlaceholder("VAR_DB_NAME", this.config.databaseName)
    this.assertNotPlaceholder("VAR_DB_ADMIN_USER", this.config.adminUserName)
    this.assertNotPlaceholder("VAR_DB_ADMIN_PASSWORD", this.config.adminUserPassword)
    this.assertSafeDevelopmentDatabaseName()
  }

  private assertDevelopmentMode(): void {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Удаление базы данных запрещено в production-среде")
    }
  }

  private assertSafeDevelopmentDatabaseName(): void {
    if (!/(^|_)(dev|development|test|local|tbase)($|_)/i.test(this.config.databaseName)) {
      throw new Error("Удаление разрешено только для базы данных разработки с явным dev/test/local именем")
    }
  }

  private assertNotPlaceholder(envName: string, value: string): void {
    if (!value || value === "УкажитеЗначение") {
      throw new Error(`Не задана обязательная переменная окружения: ${envName}`)
    }
  }

  private quoteIdentifier(value: string): string {
    if (!/^[A-Za-z0-9_]+$/.test(value)) {
      throw new Error(`Некорректный SQL identifier: ${value}`)
    }

    if (this.dialect === "postgres") {
      return `"${value.replace(/"/g, "\"\"")}"`
    }

    return `\`${value}\``
  }

  private quoteString(value: string): string {
    return `'${value.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`
  }

  private createPostgresRole(userName: string, password: string): Promise<unknown> {
    return this.sequelize.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = ${this.quoteString(userName)}) THEN
          CREATE ROLE ${this.quoteIdentifier(userName)} LOGIN PASSWORD ${this.quoteString(password)};
        ELSE
          ALTER ROLE ${this.quoteIdentifier(userName)} WITH LOGIN PASSWORD ${this.quoteString(password)};
        END IF;
      END
      $$;
    `)
  }

  private getSupportedDialect(dialect: string): "mysql" | "postgres" {
    if (dialect === "mysql" || dialect === "postgres") return dialect

    throw new Error(`Неподдерживаемый database dialect: ${dialect}`)
  }

  private assertSupportedDialect(): void {
    this.getSupportedDialect(this.config.databaseDialect)
  }

  private getDialectModule(): Options["dialectModule"] {
    if (this.dialect === "postgres") return postgresDriver

    return mysql2
  }

  private getAdminConnectionDatabase(): string | undefined {
    if (this.dialect === "postgres") return "postgres"

    return undefined
  }

  private createSequelize(database?: string): Sequelize {
    return new Sequelize({
      host: this.config.databaseHost,
      username: this.config.adminUserName,
      password: this.config.adminUserPassword,
      port: this.databasePort,
      database,
      dialect: this.dialect,
      dialectModule: this.getDialectModule(),
      logging: false
    })
  }

  private getDatabasePort(port?: string): number | undefined {
    if (!port) return undefined

    const parsedPort = Number(port)
    if (!Number.isInteger(parsedPort) || parsedPort < 1 || parsedPort > 65535) {
      throw new Error("VAR_DB_PORT должен быть номером TCP-порта")
    }

    return parsedPort
  }

  private getPostgresGrantOperations(operations: string[]): string[] {
    return operations.filter((operation) => operation !== "INDEX")
  }

  private isMissingTargetDatabaseError(error: unknown): boolean {
    return error instanceof Error && /database .* does not exist/i.test(error.message)
  }
}
