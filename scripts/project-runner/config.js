const { existsSync, readFileSync } = require("fs")
const { join, resolve } = require("path")

const rootDirectory = resolve(__dirname, "../..")
const frontendPackageDirectory = join(rootDirectory, "monolith")
const servicesDirectory = join(rootDirectory, "services")
const gatewaysDirectory = join(rootDirectory, "gateways")
const packageConfigFileName = "package.config.json"
const rootDevelopmentConfigFileName = "development.config.json"
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

  if (!existsSync(configPath)) {
    throw new Error(`Не найден корневой ${rootDevelopmentConfigFileName}`)
  }

  const config = JSON.parse(readFileSync(configPath, "utf-8"))
  const localhost = config.localhost

  if (!localhost || typeof localhost !== "object" || Array.isArray(localhost)) {
    throw new Error(`В ${rootDevelopmentConfigFileName} должен быть объект localhost`)
  }

  validateRequiredDevelopmentConfigValue(localhost.publicUserCookieDomain, "localhost.publicUserCookieDomain")
  validateRequiredDevelopmentConfigValue(localhost.httpOrigin, "localhost.httpOrigin")
  validateRequiredDevelopmentConfigValue(localhost.baseUrl, "localhost.baseUrl")

  return config
}

function validateRequiredDevelopmentConfigValue(value, path) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`В ${rootDevelopmentConfigFileName} должно быть задано строковое значение ${path}`)
  }
}

module.exports = {
  createProjectConfig
}
