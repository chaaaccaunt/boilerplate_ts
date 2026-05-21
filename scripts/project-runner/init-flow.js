const { existsSync, readFileSync, writeFileSync } = require("fs")
const { join } = require("path")
const { getPackageDirectoryNames } = require("./workspaces")
const { getDatabaseRuntimeUserConfigItems, getRuntimePackageUid, getLocalhostPackagePort, getLocalhostPackagePorts } = require("./package-config")
const { getPackageLocalEnv, parseEnvFile, updateEnvFile, writeDevelopmentEnvFile } = require("./env-files")

function parseInitOptions(args, config) {
  if (args.length !== 3) {
    throw new Error("Формат команды: init <db-host> <db-admin-user> <db-admin-password>")
  }

  const [databaseHost, databaseAdminUserName, databaseAdminPassword] = args

  validateInitArgument(databaseHost, "db-host")
  validateInitArgument(databaseAdminUserName, "db-admin-user")
  validateInitArgument(databaseAdminPassword, "db-admin-password")

  return {
    noNginx: config.localhostNoNginx,
    databaseHost: databaseHost.trim(),
    credentials: [databaseAdminUserName.trim(), databaseAdminPassword.trim()]
  }
}

function validateInitArgument(value, name) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Аргумент ${name} должен быть непустой строкой`)
  }
}

function updateRuntimeDevelopmentEnvFiles(config, migrationWorkspaceDirectory) {
  const migrationEnv = getPackageLocalEnv(migrationWorkspaceDirectory, "start")
  const runtimeUsers = parseRuntimeUsers(migrationEnv.VAR_DB_RUNTIME_GRANTS)

  runtimeUsers.forEach((runtimeUser) => {
    const packageDirectory = resolveRuntimeUserPackageDirectory(config, runtimeUser.userName)
    if (!packageDirectory) return

    const envFilePath = join(packageDirectory, ".dev.env")
    if (!existsSync(envFilePath)) return

    const nextValues = {
      VAR_DB_DIALECT: migrationEnv.VAR_DB_DIALECT,
      VAR_DB_HOST: migrationEnv.VAR_DB_HOST,
      VAR_DB_PORT: migrationEnv.VAR_DB_PORT,
      VAR_DB_NAME: migrationEnv.VAR_DB_NAME,
      VAR_DB_USER: runtimeUser.userName,
      VAR_DB_PASSWORD: runtimeUser.password
    }

    writeFileSync(envFilePath, updateEnvFile(readFileSync(envFilePath, "utf-8"), nextValues), "utf-8")
    console.log(`Обновлены runtime DB credentials: ${envFilePath}`)
  })
}

function getLocalhostDatabaseAdminCredentials(args, migrationWorkspaceDirectory) {
  if (args.length === 2) {
    return {
      userName: args[0],
      password: args[1]
    }
  }

  const envFilePath = join(migrationWorkspaceDirectory, ".dev.env")
  const migrationEnv = existsSync(envFilePath)
    ? parseEnvFile(readFileSync(envFilePath, "utf-8"))
    : {}

  const userName = migrationEnv.VAR_DB_ADMIN_USER || process.env.VAR_DB_ADMIN_USER
  const password = migrationEnv.VAR_DB_ADMIN_PASSWORD || process.env.VAR_DB_ADMIN_PASSWORD

  if (!userName || !password || userName === "УкажитеЗначение" || password === "УкажитеЗначение") {
    throw new Error("Укажите admin-доступ к database server: npm run project -- init <db-host> <db-admin-user> <db-admin-password>")
  }

  return { userName, password }
}

function writeLocalhostDevelopmentEnvFiles(config, databaseAdminUserName, databaseAdminPassword, options = {}) {
  const runtimeUsers = getDatabaseRuntimeUserConfigItems(config)
  const localhostPackagePorts = getLocalhostPackagePorts(config)
  const runtimeGrants = runtimeUsers.map((runtimeUser) => ({
    userName: runtimeUser.userName,
    password: runtimeUser.password,
    host: config.localhostDatabaseServiceHost,
    grants: runtimeUser.grants
  }))

  writeDevelopmentEnvFile(join(config.servicesDirectory, "database-migration"), {
    VAR_APP_LOG_LEVEL: getDevelopmentLogLevel(config),
    VAR_HTTP_PORT: "8094",
    VAR_HTTP_ORIGIN: getLocalhostHttpOrigin(config, options),
    VAR_HTTP_COOKIE_NAME: config.localhostCookieName,
    VAR_HTTP_PUBLIC_USER_COOKIE_NAME: config.localhostPublicUserCookieName,
    VAR_HTTP_PUBLIC_USER_COOKIE_DOMAIN: config.localhostPublicUserCookieDomain,
    VAR_HTTP_JWT_SECRET: config.localhostJwtSecret,
    VAR_HTTP_JWT_AUDIENCE: config.localhostJwtAudience,
    VAR_HTTP_JWT_ISSUER: config.localhostJwtIssuer,
    ...createNoNginxHttpDevelopmentEnv(options),
    VAR_INTERNAL_SERVICE_TOKEN: config.localhostInternalServiceToken,
    VAR_DB_DIALECT: config.localhostDatabaseDialect,
    VAR_DB_HOST: getInitDatabaseHost(config, options),
    VAR_DB_PORT: config.localhostDatabasePort,
    VAR_DB_NAME: config.localhostDatabaseName,
    VAR_DB_USER: config.localhostMigrationUser.userName,
    VAR_DB_PASSWORD: config.localhostMigrationUser.password,
    VAR_DB_ADMIN_USER: databaseAdminUserName,
    VAR_DB_ADMIN_PASSWORD: databaseAdminPassword,
    VAR_DB_SERVICE_HOST: config.localhostDatabaseServiceHost,
    VAR_DB_SERVICE_GRANTS: "SELECT,INSERT,UPDATE,DELETE,CREATE,ALTER,DROP,INDEX,REFERENCES",
    VAR_DB_RUNTIME_GRANTS: JSON.stringify(runtimeGrants)
  })

  writeLocalhostServiceDevelopmentEnvFiles(config, runtimeUsers, localhostPackagePorts, options)
  writeLocalhostGatewayDevelopmentEnvFiles(config, runtimeUsers, localhostPackagePorts, options)

  writeDevelopmentEnvFile(config.frontendPackageDirectory, createFrontendDevelopmentEnv(config, localhostPackagePorts, options))
}

function writeLocalhostServiceDevelopmentEnvFiles(config, runtimeUsers, localhostPackagePorts, options) {
  getPackageDirectoryNames(config.servicesDirectory)
    .filter((packageName) => packageName !== "database-migration")
    .forEach((packageName) => {
      writeLocalhostBackendPackageDevelopmentEnvFile(config, {
        packageKind: "service",
        packageName,
        packageDirectory: join(config.servicesDirectory, packageName),
        port: getLocalhostPackagePort(localhostPackagePorts, "service", packageName),
        localhostPackagePorts,
        runtimeUsers,
        databaseHost: options.databaseHost
      })
    })
}

function writeLocalhostGatewayDevelopmentEnvFiles(config, runtimeUsers, localhostPackagePorts, options) {
  getPackageDirectoryNames(config.gatewaysDirectory)
    .forEach((packageName) => {
      writeLocalhostBackendPackageDevelopmentEnvFile(config, {
        packageKind: "gateway",
        packageName,
        packageDirectory: join(config.gatewaysDirectory, packageName),
        port: getLocalhostPackagePort(localhostPackagePorts, "gateway", packageName),
        localhostPackagePorts,
        runtimeUsers,
        noNginx: options.noNginx,
        databaseHost: options.databaseHost
      })
    })
}

function writeLocalhostBackendPackageDevelopmentEnvFile(config, options) {
  const runtimeUser = options.runtimeUsers.find((item) => item.packageKind === options.packageKind && item.packageName === options.packageName)

  writeDevelopmentEnvFile(options.packageDirectory, {
    ...createHttpDevelopmentEnv(config, options.port, options),
    ...createBackendDatabaseDevelopmentEnv(config, runtimeUser, options),
    ...createBackendCommonDevelopmentEnv(config, options.packageKind, options.packageName),
    ...getLocalhostPackageSpecificDevelopmentEnv(config, options.packageKind, options.packageName, options.localhostPackagePorts)
  })
}

function createBackendDatabaseDevelopmentEnv(config, runtimeUser, options = {}) {
  if (!runtimeUser) return {}

  return {
    VAR_DB_DIALECT: config.localhostDatabaseDialect,
    VAR_DB_HOST: getInitDatabaseHost(config, options),
    VAR_DB_PORT: config.localhostDatabasePort,
    VAR_DB_NAME: config.localhostDatabaseName,
    VAR_DB_USER: runtimeUser.userName,
    VAR_DB_PASSWORD: runtimeUser.password
  }
}

function getInitDatabaseHost(config, options = {}) {
  return options.databaseHost || config.localhostDatabaseHost
}

function getLocalhostPackageSpecificDevelopmentEnv(config, packageKind, packageName, localhostPackagePorts) {
  if (packageKind === "service" && packageName === "log-collector") {
    return {
      VAR_LOG_COLLECTOR_CLIENT_ENABLED: "false",
      VAR_LOG_COLLECTOR_SOCKET_PORT: config.localhostLogCollectorSocketPort
    }
  }

  if (packageKind === "gateway" && packageName === "authorization") {
    return {}
  }

  if (packageKind === "gateway" && packageName === "public") {
    return {
      VAR_USERS_SERVICE_URL: `http://localhost:${getLocalhostPackagePort(localhostPackagePorts, "service", "users")}`,
      VAR_CHAT_SERVICE_URL: `http://localhost:${getLocalhostPackagePort(localhostPackagePorts, "service", "chat")}`,
      VAR_LOG_COLLECTOR_SERVICE_URL: `http://localhost:${getLocalhostPackagePort(localhostPackagePorts, "service", "log-collector")}`
    }
  }

  if (packageKind === "gateway" && packageName === "chat-realtime") {
    return {
      VAR_CHAT_SERVICE_URL: `http://localhost:${getLocalhostPackagePort(localhostPackagePorts, "service", "chat")}`
    }
  }

  return {}
}

function createHttpDevelopmentEnv(config, port, options = {}) {
  return {
    VAR_APP_LOG_LEVEL: getDevelopmentLogLevel(config),
    VAR_HTTP_PORT: port,
    VAR_HTTP_ORIGIN: getLocalhostHttpOrigin(config, options),
    VAR_HTTP_COOKIE_NAME: config.localhostCookieName,
    VAR_HTTP_PUBLIC_USER_COOKIE_NAME: config.localhostPublicUserCookieName,
    VAR_HTTP_PUBLIC_USER_COOKIE_DOMAIN: config.localhostPublicUserCookieDomain,
    VAR_HTTP_JWT_SECRET: config.localhostJwtSecret,
    VAR_HTTP_JWT_AUDIENCE: config.localhostJwtAudience,
    VAR_HTTP_JWT_ISSUER: config.localhostJwtIssuer,
    ...createNoNginxHttpDevelopmentEnv(options)
  }
}

function createNoNginxHttpDevelopmentEnv(options = {}) {
  if (!options.noNginx) return {}

  return {
    VAR_HTTP_ENABLE_PREFLIGHT: "true",
    VAR_HTTP_ALLOW_HOST_ONLY_COOKIES: "true"
  }
}

function getLocalhostHttpOrigin(config, options = {}) {
  return options.noNginx ? config.localhostNoNginxHttpOrigin : config.localhostHttpOrigin
}

function createFrontendDevelopmentEnv(config, localhostPackagePorts, options = {}) {
  if (!options.noNginx) {
    return {
      VUE_APP_BASE_URL: config.baseUrl,
      VUE_APP_AUTHORIZATION_PUBLIC_USER_COOKIE_NAME: config.localhostPublicUserCookieName,
      VUE_APP_HOSTNAME: config.localhostHttpOrigin
    }
  }

  return {
    VUE_APP_BASE_URL: `http://localhost:${getLocalhostPackagePort(localhostPackagePorts, "gateway", "public")}`,
    VUE_APP_AUTHORIZATION_BASE_URL: `http://localhost:${getLocalhostPackagePort(localhostPackagePorts, "gateway", "authorization")}`,
    VUE_APP_FILES_BASE_URL: `http://localhost:${getLocalhostPackagePort(localhostPackagePorts, "gateway", "files")}`,
    VUE_APP_WEBSOCKET_BASE_URL: `http://localhost:${getLocalhostPackagePort(localhostPackagePorts, "gateway", "chat-realtime")}`,
    VUE_APP_AUTHORIZATION_PUBLIC_USER_COOKIE_NAME: config.localhostPublicUserCookieName,
    VUE_APP_HOSTNAME: config.localhostNoNginxHttpOrigin
  }
}

function createBackendCommonDevelopmentEnv(config, packageKind, packageName) {
  return {
    VAR_INTERNAL_SERVICE_TOKEN: config.localhostInternalServiceToken,
    VAR_PACKAGE_UID: getRuntimePackageUid(config, packageKind, packageName),
    VAR_LOG_COLLECTOR_CLIENT_ENABLED: "true",
    VAR_LOG_COLLECTOR_SOCKET_HOST: config.localhostLogCollectorSocketHost,
    VAR_LOG_COLLECTOR_SOCKET_PORT: config.localhostLogCollectorSocketPort,
    VAR_LOG_SOURCE: `${packageName}-${packageKind}`
  }
}

function parseRuntimeUsers(rawValue) {
  if (!rawValue || rawValue === "УкажитеЗначение") return []

  const parsedValue = JSON.parse(rawValue)
  if (!Array.isArray(parsedValue)) throw new Error("VAR_DB_RUNTIME_GRANTS должен быть JSON array")

  return parsedValue.map((runtimeUser) => {
    if (!runtimeUser || typeof runtimeUser !== "object" || Array.isArray(runtimeUser)) {
      throw new Error("Runtime user grant должен быть object")
    }

    if (typeof runtimeUser.userName !== "string" || !runtimeUser.userName.trim()) {
      throw new Error("Не задано поле userName в VAR_DB_RUNTIME_GRANTS")
    }

    if (typeof runtimeUser.password !== "string" || !runtimeUser.password.trim()) {
      throw new Error("Не задано поле password в VAR_DB_RUNTIME_GRANTS")
    }

    return {
      userName: runtimeUser.userName.trim(),
      password: runtimeUser.password.trim(),
      grants: Array.isArray(runtimeUser.grants) ? runtimeUser.grants : []
    }
  })
}

function resolveRuntimeUserPackageDirectory(config, userName) {
  const packageKind = getRuntimeUserPackageKind(userName)
  const packageName = getRuntimeUserPackageName(userName)

  if (packageKind === "service") {
    return resolvePackageDirectoryByName(config.servicesDirectory, packageName)
  }

  if (packageKind === "gateway") {
    return resolvePackageDirectoryByName(config.gatewaysDirectory, packageName)
  }

  return null
}

function getRuntimeUserPackageKind(userName) {
  const normalizedUserName = userName.replace(/^boilerplate_/, "")

  if (normalizedUserName.endsWith("_svc") || normalizedUserName.endsWith("_service")) return "service"
  if (normalizedUserName.endsWith("_gw") || normalizedUserName.endsWith("_gateway")) return "gateway"

  return null
}

function getRuntimeUserPackageName(userName) {
  const normalizedUserName = userName.replace(/^boilerplate_/, "")

  if (normalizedUserName.endsWith("_svc")) return normalizedUserName.slice(0, -"_svc".length).replace(/_/g, "-")
  if (normalizedUserName.endsWith("_service")) return normalizedUserName.slice(0, -"_service".length).replace(/_/g, "-")
  if (normalizedUserName.endsWith("_gw")) return normalizedUserName.slice(0, -"_gw".length).replace(/_/g, "-")
  if (normalizedUserName.endsWith("_gateway")) return normalizedUserName.slice(0, -"_gateway".length).replace(/_/g, "-")

  return null
}

function resolvePackageDirectoryByName(packagesDirectory, rawPackageName) {
  const packageName = rawPackageName.replace(/_/g, "-")
  const packageDirectory = join(packagesDirectory, packageName)

  if (!existsSync(packageDirectory)) return null

  return packageDirectory
}

module.exports = {
  getLocalhostDatabaseAdminCredentials,
  parseInitOptions,
  updateRuntimeDevelopmentEnvFiles,
  writeLocalhostDevelopmentEnvFiles
}

function getDevelopmentLogLevel(config) {
  return config.localhostDebug ? "debug" : "info"
}
