import mysql2 from "mysql2"
import * as postgresDriver from "pg"
import { Dialect, Options } from "sequelize"
import { iHTTPConfig } from "../HTTPServer"
import { Envs } from "./env"

export { Envs }

export interface iAppConfig {
  app: {
    LOG_LEVEL?: string
  }
  http: iHTTPConfig
  db?: Options
  internalServices: {
    token?: string
    usersUrl?: string
    chatUrl?: string
    logCollectorUrl?: string
    chatRealtimeGatewayUrl?: string
  }
}

type EnvValues = Partial<Record<keyof NodeJS.ProcessEnv, string>>

export class AppConfiguration {
  private readonly requiredEnvKeys: EnvValues
  private readonly optionalEnvKeys: readonly (keyof NodeJS.ProcessEnv)[] = [
    "VAR_APP_LOG_LEVEL",
    "VAR_INTERNAL_SERVICE_TOKEN",
    "VAR_DB_HOST",
    "VAR_DB_DIALECT",
    "VAR_DB_NAME",
    "VAR_DB_PASSWORD",
    "VAR_DB_PORT",
    "VAR_DB_USER",
    "VAR_HTTP_ALLOW_HOST_ONLY_COOKIES",
    "VAR_HTTP_ENABLE_PREFLIGHT",
    "VAR_USERS_SERVICE_URL",
    "VAR_CHAT_SERVICE_URL",
    "VAR_CHAT_REALTIME_GATEWAY_URL",
    "VAR_LOG_COLLECTOR_SERVICE_URL"
  ] as const

  readonly config: iAppConfig

  constructor() {
    Envs.assignEnv()
    this.requiredEnvKeys = this.getRequiredEnvKeys()
    this.validateEnv()
    this.config = {
      app: {
        LOG_LEVEL: this.requiredEnvKeys.VAR_APP_LOG_LEVEL
      },
      http: {
        port: this.getRequiredEnv("VAR_HTTP_PORT"),
        origin: this.getRequiredEnv("VAR_HTTP_ORIGIN"),
        cookie_name: this.getRequiredEnv("VAR_HTTP_COOKIE_NAME"),
        public_user_cookie_name: this.getRequiredEnv("VAR_HTTP_PUBLIC_USER_COOKIE_NAME"),
        public_user_cookie_domain: this.getRequiredEnv("VAR_HTTP_PUBLIC_USER_COOKIE_DOMAIN"),
        jwt_audience: this.getRequiredEnv("VAR_HTTP_JWT_AUDIENCE"),
        jwt_issuer: this.getRequiredEnv("VAR_HTTP_JWT_ISSUER"),
        jwt_secret: this.getRequiredEnv("VAR_HTTP_JWT_SECRET"),
        allowHostOnlyCookies: this.getBooleanEnv("VAR_HTTP_ALLOW_HOST_ONLY_COOKIES"),
        enablePreflight: this.getBooleanEnv("VAR_HTTP_ENABLE_PREFLIGHT"),
      },
      db: this.getDatabaseConfig(),
      internalServices: {
        token: this.requiredEnvKeys.VAR_INTERNAL_SERVICE_TOKEN,
        usersUrl: this.requiredEnvKeys.VAR_USERS_SERVICE_URL,
        chatUrl: this.requiredEnvKeys.VAR_CHAT_SERVICE_URL,
        logCollectorUrl: this.requiredEnvKeys.VAR_LOG_COLLECTOR_SERVICE_URL,
        chatRealtimeGatewayUrl: this.requiredEnvKeys.VAR_CHAT_REALTIME_GATEWAY_URL
      }
    }
  }

  private getRequiredEnvKeys(): EnvValues {
    return {
      VAR_DB_HOST: this.getProcessEnvValue("VAR_DB_HOST"),
      VAR_DB_DIALECT: this.getProcessEnvValue("VAR_DB_DIALECT"),
      VAR_DB_NAME: this.getProcessEnvValue("VAR_DB_NAME"),
      VAR_DB_PASSWORD: this.getProcessEnvValue("VAR_DB_PASSWORD"),
      VAR_DB_PORT: this.getProcessEnvValue("VAR_DB_PORT"),
      VAR_DB_USER: this.getProcessEnvValue("VAR_DB_USER"),
      VAR_HTTP_PORT: this.getProcessEnvValue("VAR_HTTP_PORT"),
      VAR_HTTP_ORIGIN: this.getProcessEnvValue("VAR_HTTP_ORIGIN"),
      VAR_HTTP_COOKIE_NAME: this.getProcessEnvValue("VAR_HTTP_COOKIE_NAME"),
      VAR_HTTP_PUBLIC_USER_COOKIE_NAME: this.getProcessEnvValue("VAR_HTTP_PUBLIC_USER_COOKIE_NAME"),
      VAR_HTTP_PUBLIC_USER_COOKIE_DOMAIN: this.getProcessEnvValue("VAR_HTTP_PUBLIC_USER_COOKIE_DOMAIN"),
      VAR_HTTP_JWT_AUDIENCE: this.getProcessEnvValue("VAR_HTTP_JWT_AUDIENCE"),
      VAR_HTTP_JWT_ISSUER: this.getProcessEnvValue("VAR_HTTP_JWT_ISSUER"),
      VAR_HTTP_JWT_SECRET: this.getProcessEnvValue("VAR_HTTP_JWT_SECRET"),
      VAR_HTTP_ALLOW_HOST_ONLY_COOKIES: this.getProcessEnvValue("VAR_HTTP_ALLOW_HOST_ONLY_COOKIES"),
      VAR_HTTP_ENABLE_PREFLIGHT: this.getProcessEnvValue("VAR_HTTP_ENABLE_PREFLIGHT"),
      VAR_INTERNAL_SERVICE_TOKEN: this.getProcessEnvValue("VAR_INTERNAL_SERVICE_TOKEN"),
      VAR_APP_LOG_LEVEL: this.getProcessEnvValue("VAR_APP_LOG_LEVEL"),
      VAR_USERS_SERVICE_URL: this.getProcessEnvValue("VAR_USERS_SERVICE_URL"),
      VAR_CHAT_SERVICE_URL: this.getProcessEnvValue("VAR_CHAT_SERVICE_URL"),
      VAR_CHAT_REALTIME_GATEWAY_URL: this.getProcessEnvValue("VAR_CHAT_REALTIME_GATEWAY_URL"),
      VAR_LOG_COLLECTOR_SERVICE_URL: this.getProcessEnvValue("VAR_LOG_COLLECTOR_SERVICE_URL")
    }
  }

  private getProcessEnvValue(key: keyof NodeJS.ProcessEnv): string | undefined {
    const value = process.env[key]
    if (!value || value === "УкажитеЗначение") return undefined

    return value
  }

  private validateEnv(): void {
    const missingKeys = []
    for (const key of Object.keys(this.requiredEnvKeys)) {
      if (!this.requiredEnvKeys[key] && !this.optionalEnvKeys.includes(key)) {
        missingKeys.push(key)
      }

      if (this.requiredEnvKeys[key] === "УкажитеЗначение" && !this.optionalEnvKeys.includes(key)) {
        missingKeys.push(key)
      }
    }
    if (missingKeys.length > 0) {
      throw new Error(`Отсутствуют обязательные переменные окружения: ${Array.from(new Set(missingKeys)).join(", ")}`)
    }

    this.validateDatabaseEnv()
  }

  private validateDatabaseEnv(): void {
    const databaseKeys: (keyof NodeJS.ProcessEnv)[] = ["VAR_DB_DIALECT", "VAR_DB_HOST", "VAR_DB_NAME", "VAR_DB_PASSWORD", "VAR_DB_USER"]
    const providedDatabaseKeys = databaseKeys.filter((key) => this.hasConfiguredEnvValue(this.requiredEnvKeys[key]))

    if (providedDatabaseKeys.length > 0 && providedDatabaseKeys.length < databaseKeys.length) {
      const missingDatabaseKeys = databaseKeys.filter((key) => !this.hasConfiguredEnvValue(this.requiredEnvKeys[key]))
      throw new Error(`Не полностью задана конфигурация БД: ${missingDatabaseKeys.join(", ")}`)
    }
  }

  private getDatabaseConfig(): Options | undefined {
    if (!this.hasConfiguredEnvValue(this.requiredEnvKeys.VAR_DB_HOST) && !this.hasConfiguredEnvValue(this.requiredEnvKeys.VAR_DB_NAME) && !this.hasConfiguredEnvValue(this.requiredEnvKeys.VAR_DB_PASSWORD) && !this.hasConfiguredEnvValue(this.requiredEnvKeys.VAR_DB_USER)) {
      return undefined
    }

    return {
      host: this.getRequiredEnv("VAR_DB_HOST"),
      database: this.getRequiredEnv("VAR_DB_NAME"),
      password: this.getRequiredEnv("VAR_DB_PASSWORD"),
      port: this.getDatabasePort(),
      username: this.getRequiredEnv("VAR_DB_USER"),
      dialect: this.getDatabaseDialect(),
      dialectModule: this.getDatabaseDialectModule(),
      logging: false
    }
  }

  private getDatabaseDialect(): Dialect {
    const dialect = this.getRequiredEnv("VAR_DB_DIALECT")

    if (dialect !== "mysql" && dialect !== "postgres") {
      throw new Error(`Неподдерживаемый Sequelize dialect: ${dialect}`)
    }

    return dialect
  }

  private getDatabaseDialectModule(): object {
    const dialect = this.getDatabaseDialect()

    if (dialect === "postgres") return postgresDriver

    return mysql2
  }

  private getDatabasePort(): number | undefined {
    const port = this.requiredEnvKeys.VAR_DB_PORT
    if (!port) return undefined

    const parsedPort = Number(port)
    if (!Number.isInteger(parsedPort) || parsedPort < 1 || parsedPort > 65535) {
      throw new Error("VAR_DB_PORT должен быть номером TCP-порта")
    }

    return parsedPort
  }

  private getRequiredEnv(key: keyof NodeJS.ProcessEnv): string {
    const value = this.requiredEnvKeys[key]
    if (!this.hasConfiguredEnvValue(value)) throw new Error(`Отсутствует обязательная переменная окружения: ${key}`)
    return value
  }

  private hasConfiguredEnvValue(value: string | undefined): value is string {
    return Boolean(value && value !== "УкажитеЗначение")
  }

  private getBooleanEnv(key: keyof NodeJS.ProcessEnv): boolean {
    return this.requiredEnvKeys[key] === "true"
  }

  deepFreeze<T extends object>(value: T): Readonly<T> {
    Object.freeze(value)

    for (const child of Object.values(value)) {
      if (this.isFreezableRecord(child)) {
        this.deepFreeze(child)
      }
    }

    return value
  }

  private isFreezableRecord(value: unknown): value is object {
    return value !== null && typeof value === "object" && !Object.isFrozen(value)
  }
}

const configInstance = new AppConfiguration()

export const config = configInstance.deepFreeze(configInstance.config)

export function getRequiredDatabaseConfig(): Options {
  if (!config.db) {
    throw new Error("Для этого package не задана конфигурация БД")
  }

  return config.db
}
