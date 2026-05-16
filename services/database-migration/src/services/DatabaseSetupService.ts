import { Sequelize } from "sequelize"

export interface DatabaseSetupConfig {
  databaseHost: string
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

  constructor(private readonly config: DatabaseSetupConfig) {
    this.sequelize = new Sequelize({
      host: config.databaseHost,
      username: config.adminUserName,
      password: config.adminUserPassword,
      dialect: "mysql",
      logging: false
    })
  }

  setup(): Promise<void> {
    this.validateConfig()

    return this.sequelize.authenticate()
      .then(() => this.createDatabase())
      .then(() => this.createServiceUser())
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
    return this.sequelize.query(`CREATE DATABASE IF NOT EXISTS ${this.quoteIdentifier(this.config.databaseName)} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`)
  }

  private dropDatabase(): Promise<unknown> {
    return this.sequelize.query(`DROP DATABASE IF EXISTS ${this.quoteIdentifier(this.config.databaseName)}`)
  }

  private createServiceUser(): Promise<unknown> {
    return this.sequelize.query(
      `CREATE USER IF NOT EXISTS ${this.quoteString(this.config.serviceUserName)}@${this.quoteString(this.config.serviceUserHost)} IDENTIFIED BY ${this.quoteString(this.config.serviceUserPassword)}`
    )
  }

  private grantServiceUserPermissions(): Promise<unknown> {
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
    return this.sequelize.query(
      `CREATE USER IF NOT EXISTS ${this.quoteString(runtimeUser.userName)}@${this.quoteString(runtimeUser.host)} IDENTIFIED BY ${this.quoteString(runtimeUser.password)}`
    )
  }

  private revokeUserPermissions(userName: string, host: string): Promise<unknown> {
    return this.sequelize.query(
      `REVOKE ALL PRIVILEGES, GRANT OPTION FROM ${this.quoteString(userName)}@${this.quoteString(host)}`
    )
  }

  private grantRuntimeUserPermissions(runtimeUser: DatabaseRuntimeUserConfig): Promise<void> {
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

    return `\`${value}\``
  }

  private quoteString(value: string): string {
    return `'${value.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`
  }
}
