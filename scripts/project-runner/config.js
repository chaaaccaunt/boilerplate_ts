const { existsSync, readFileSync } = require("fs")
const { join, resolve } = require("path")

const rootDirectory = resolve(__dirname, "../..")
const frontendPackageDirectory = join(rootDirectory, "monolith")
const servicesDirectory = join(rootDirectory, "services")
const gatewaysDirectory = join(rootDirectory, "gateways")
const packageConfigFileName = "package.config.json"
const rootDevelopmentConfigFileName = "development.config.json"
const rootDevelopmentConfigExampleFileName = "development.config.example.json"
const localhostNoNginxHttpOrigin = "http://localhost:8080"

function createProjectConfig() {
  const developmentConfig = getDevelopmentConfig()

  return {
    rootDirectory,
    frontendPackageDirectory,
    servicesDirectory,
    gatewaysDirectory,
    packageConfigFileName,
    rootDevelopmentConfigFileName,
    rootDevelopmentConfigExampleFileName,
    localhostDatabaseName: "boilerplate_dev",
    localhostPublicUserCookieDomain: developmentConfig.localhost.publicUserCookieDomain,
    localhostHttpOrigin: developmentConfig.localhost.httpOrigin,
    baseUrl: developmentConfig.localhost.baseUrl,
    localhostNoNginxHttpOrigin,
    localhostCookieName: "authorization",
    localhostPublicUserCookieName: "authorization_user",
    localhostJwtSecret: "localhost-development-jwt-secret",
    localhostJwtAudience: "boilerplate-ts-localhost",
    localhostJwtIssuer: "boilerplate-ts-localhost",
    localhostInternalServiceToken: "localhost-development-internal-service-token",
    localhostLogCollectorSocketHost: "localhost",
    localhostLogCollectorSocketPort: "4304",
    localhostMigrationUser: {
      userName: "migration_service",
      password: "migration_service"
    },
    allowedRuntimeGrantOperations: new Set(["SELECT", "INSERT", "UPDATE", "DELETE", "INDEX", "REFERENCES"])
  }
}

function getDevelopmentConfig() {
  const configPath = join(rootDirectory, rootDevelopmentConfigFileName)
  const fallbackConfigPath = join(rootDirectory, rootDevelopmentConfigExampleFileName)
  const sourceConfigPath = existsSync(configPath) ? configPath : fallbackConfigPath
  const sourceConfigFileName = existsSync(configPath) ? rootDevelopmentConfigFileName : rootDevelopmentConfigExampleFileName

  if (!existsSync(sourceConfigPath)) {
    throw new Error(`Не найден корневой ${rootDevelopmentConfigFileName} или fallback ${rootDevelopmentConfigExampleFileName}`)
  }

  const config = JSON.parse(readFileSync(sourceConfigPath, "utf-8"))
  const localhost = config.localhost

  if (!localhost || typeof localhost !== "object" || Array.isArray(localhost)) {
    throw new Error(`В ${sourceConfigFileName} должен быть объект localhost`)
  }

  validateRequiredDevelopmentConfigValue(localhost.publicUserCookieDomain, "localhost.publicUserCookieDomain", sourceConfigFileName)
  validateRequiredDevelopmentConfigValue(localhost.httpOrigin, "localhost.httpOrigin", sourceConfigFileName)
  validateRequiredDevelopmentConfigValue(localhost.baseUrl, "localhost.baseUrl", sourceConfigFileName)

  return config
}

function validateRequiredDevelopmentConfigValue(value, path, configFileName) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`В ${configFileName} должно быть задано строковое значение ${path}`)
  }
}

module.exports = {
  createProjectConfig
}
