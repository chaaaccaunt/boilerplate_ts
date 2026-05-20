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
const defaultDatabaseDialect = "mysql"
const defaultDatabaseHost = "localhost"
const defaultDatabaseServiceHost = "localhost"
const defaultDatabasePorts = {
  mysql: "3306",
  postgres: "5432"
}

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
    localhostDatabaseDialect: getLocalhostDatabaseDialect(developmentConfig),
    localhostDatabaseHost: getLocalhostDatabaseHost(developmentConfig),
    localhostDatabasePort: getLocalhostDatabasePort(developmentConfig),
    localhostDatabaseServiceHost: getLocalhostDatabaseServiceHost(developmentConfig),
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
  validateOptionalDatabaseConfig(localhost.database, sourceConfigFileName)

  return config
}

function validateRequiredDevelopmentConfigValue(value, path, configFileName) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`В ${configFileName} должно быть задано строковое значение ${path}`)
  }
}

function validateOptionalDatabaseConfig(database, configFileName) {
  if (database === undefined) return

  if (!database || typeof database !== "object" || Array.isArray(database)) {
    throw new Error(`В ${configFileName} localhost.database должен быть объектом`)
  }

  if (database.dialect !== undefined && database.dialect !== "mysql" && database.dialect !== "postgres") {
    throw new Error(`В ${configFileName} localhost.database.dialect должен быть mysql или postgres`)
  }

  validateOptionalDevelopmentConfigString(database.host, "localhost.database.host", configFileName)
  validateOptionalDevelopmentConfigString(database.port, "localhost.database.port", configFileName)
  validateOptionalDevelopmentConfigString(database.serviceHost, "localhost.database.serviceHost", configFileName)
}

function validateOptionalDevelopmentConfigString(value, path, configFileName) {
  if (value !== undefined && (typeof value !== "string" || !value.trim())) {
    throw new Error(`В ${configFileName} должно быть задано строковое значение ${path}`)
  }
}

function getLocalhostDatabaseConfig(developmentConfig) {
  return developmentConfig.localhost.database || {}
}

function getLocalhostDatabaseDialect(developmentConfig) {
  return getLocalhostDatabaseConfig(developmentConfig).dialect || defaultDatabaseDialect
}

function getLocalhostDatabaseHost(developmentConfig) {
  return getLocalhostDatabaseConfig(developmentConfig).host || defaultDatabaseHost
}

function getLocalhostDatabasePort(developmentConfig) {
  const dialect = getLocalhostDatabaseDialect(developmentConfig)
  return getLocalhostDatabaseConfig(developmentConfig).port || defaultDatabasePorts[dialect]
}

function getLocalhostDatabaseServiceHost(developmentConfig) {
  return getLocalhostDatabaseConfig(developmentConfig).serviceHost || defaultDatabaseServiceHost
}

module.exports = {
  createProjectConfig
}
