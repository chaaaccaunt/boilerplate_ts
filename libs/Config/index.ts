import { writeFileSync } from "fs"
import mysql2 from "mysql2"
import { Options } from "sequelize"
import { iHTTPConfig } from "../HTTPServer"
import { Envs } from "./env"

export interface iAppConfig {
  app: {
    LOG_LEVEL?: string
  }
  http: iHTTPConfig
  db: Options
  internalServices: {
    authorizationUrl?: string
    usersUrl?: string
    chatUrl?: string
  }
}

export class AppConfiguration {
  private readonly requiredEnvKeys: NodeJS.ProcessEnv
  private readonly optionalEnvKeys: readonly (keyof NodeJS.ProcessEnv)[] = [
    "VAR_APP_LOG_LEVEL",
    "VAR_HTTP_JWT_AUDIENCE",
    "VAR_HTTP_JWT_ISSUER",
    "VAR_AUTHORIZATION_SERVICE_URL",
    "VAR_USERS_SERVICE_URL",
    "VAR_CHAT_SERVICE_URL",
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
        jwt_audience: this.requiredEnvKeys.VAR_HTTP_JWT_AUDIENCE,
        jwt_issuer: this.requiredEnvKeys.VAR_HTTP_JWT_ISSUER,
        jwt_secret: this.getRequiredEnv("VAR_HTTP_JWT_SECRET"),
      },
      db: {
        host: this.getRequiredEnv("VAR_DB_HOST"),
        database: this.getRequiredEnv("VAR_DB_NAME"),
        password: this.getRequiredEnv("VAR_DB_PASSWORD"),
        username: this.getRequiredEnv("VAR_DB_USER"),
        dialect: "mysql",
        dialectModule: mysql2
      },
      internalServices: {
        authorizationUrl: this.requiredEnvKeys.VAR_AUTHORIZATION_SERVICE_URL,
        usersUrl: this.requiredEnvKeys.VAR_USERS_SERVICE_URL,
        chatUrl: this.requiredEnvKeys.VAR_CHAT_SERVICE_URL
      }
    }
  }

  private getRequiredEnvKeys(): NodeJS.ProcessEnv {
    return {
      VAR_DB_HOST: process.env.VAR_DB_HOST,
      VAR_DB_NAME: process.env.VAR_DB_NAME,
      VAR_DB_PASSWORD: process.env.VAR_DB_PASSWORD,
      VAR_DB_USER: process.env.VAR_DB_USER,
      VAR_HTTP_PORT: process.env.VAR_HTTP_PORT,
      VAR_HTTP_ORIGIN: process.env.VAR_HTTP_ORIGIN,
      VAR_HTTP_COOKIE_NAME: process.env.VAR_HTTP_COOKIE_NAME,
      VAR_HTTP_JWT_AUDIENCE: process.env.VAR_HTTP_JWT_AUDIENCE,
      VAR_HTTP_JWT_ISSUER: process.env.VAR_HTTP_JWT_ISSUER,
      VAR_HTTP_JWT_SECRET: process.env.VAR_HTTP_JWT_SECRET,
      VAR_APP_LOG_LEVEL: process.env.VAR_APP_LOG_LEVEL,
      VAR_AUTHORIZATION_SERVICE_URL: process.env.VAR_AUTHORIZATION_SERVICE_URL,
      VAR_USERS_SERVICE_URL: process.env.VAR_USERS_SERVICE_URL,
      VAR_CHAT_SERVICE_URL: process.env.VAR_CHAT_SERVICE_URL
    }
  }

  private validateEnv(): void {
    const missingKeys = []
    for (const key of Object.keys(this.requiredEnvKeys)) {
      if (!this.requiredEnvKeys[key] && !this.optionalEnvKeys.includes(key)) {
        missingKeys.push(key)
      }
    }
    if (missingKeys.length > 0) {
      const existValues = Envs.getEnvFileData()
      if (existValues) writeFileSync(existValues.path, `${existValues.data}\n${missingKeys.map(k => `${k}=УкажитеЗначение`).join("\n")}`)
      throw new Error(`Отсутствуют обязательные переменные окружения: ${missingKeys.join(", ")}`)
    }
  }

  private getRequiredEnv(key: keyof NodeJS.ProcessEnv): string {
    const value = this.requiredEnvKeys[key]
    if (!value) throw new Error(`Отсутствует обязательная переменная окружения: ${key}`)
    return value
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
