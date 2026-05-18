const { existsSync, readdirSync, readFileSync, writeFileSync } = require("fs")
const { join, resolve } = require("path")
const { spawn } = require("child_process")

const rootDirectory = __dirname
const frontendPackageDirectory = join(rootDirectory, "monolith")
const servicesDirectory = join(rootDirectory, "services")
const gatewaysDirectory = join(rootDirectory, "gateways")
const databaseGrantConfigFileName = "database-grants.json"
const localhostDatabaseName = "boilerplate_dev"
const localhostPublicUserCookieDomain = ".gtrktuva.local"
const localhostHttpOrigin = "http://test.gtrktuva.local"
const baseUrl = "http://testapi.gtrktuva.local"
const localhostNoNginxHttpOrigin = "http://localhost:8080"
const localhostCookieName = "authorization"
const localhostPublicUserCookieName = "authorization_user"
const localhostJwtSecret = "localhost-development-jwt-secret"
const localhostJwtAudience = "boilerplate-ts-localhost"
const localhostJwtIssuer = "boilerplate-ts-localhost"
const localhostInternalServiceToken = "localhost-development-internal-service-token"
const localhostLogCollectorSocketHost = "localhost"
const localhostLogCollectorSocketPort = "4304"
const localhostMigrationUser = {
  userName: "migration_service",
  password: "migration_service"
}
const localhostDefaultPackagePorts = {
  service: {
    users: "4102",
    chat: "4103",
    "log-collector": "4104"
  },
  gateway: {
    public: "4200",
    authorization: "4201",
    files: "4202",
    "chat-realtime": "4203"
  }
}
const allowedRuntimeGrantOperations = new Set(["SELECT", "INSERT", "UPDATE", "DELETE", "INDEX", "REFERENCES"])

const frontendWorkspaceName = getPackageName(frontendPackageDirectory)
const serviceWorkspaceNames = getPackageWorkspaceNames(servicesDirectory)
const gatewayWorkspaceNames = getPackageWorkspaceNames(gatewaysDirectory)
const serviceWorkspaceOptions = getPackageWorkspaceOptions(servicesDirectory)

const commands = {
  help: {
    description: "Показать список команд",
    handler: showHelp
  },
  install: {
    description: "Установить зависимости: install [all|frontend|service <name>|gateway <name>]",
    handler: handleInstall
  },
  dev: {
    description: "Запустить разработку: dev [all|frontend|service <name>|gateway <name>]",
    handler: handleDevelopment
  },
  build: {
    description: "Собрать проект: build [all|frontend|service <name>|gateway <name>]",
    handler: handleBuild
  },
  typecheck: {
    description: "Проверить типы: typecheck [all|shared|frontend|service <name>|gateway <name>]",
    handler: handleTypecheck
  },
  migrate: {
    description: "Выполнить миграции базы данных: migrate [dev|dist]",
    handler: handleMigrate
  },
  localhost: {
    description: "Инициализировать development env из database-grants.json, пересоздать БД и запустить localhost: localhost [noNginx] [db-root-user db-root-password]",
    handler: handleLocalhost
  },
  "start-dist": {
    description: "Запустить production bundle: start-dist [service <name>|gateway <name>]",
    handler: handleStartDist
  },
  workspace: {
    description: "Запустить workspace script: workspace <workspace|frontend|service:name|gateway:name> <script> [...args]",
    handler: handleWorkspace
  }
}

main()

function main() {
  const [commandName = "help", ...args] = process.argv.slice(2)
  const command = commands[commandName]

  if (!command) {
    console.error(`Неизвестная команда: ${commandName}`)
    showHelp()
    process.exit(1)
  }

  return Promise.resolve()
    .then(() => command.handler(args))
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error))
      process.exit(1)
    })
}

function handleInstall(args) {
  const target = getTarget(args, "all")

  if (target.kind === "all") return run("npm", ["install"])
  if (target.kind === "frontend") return runWorkspaceCommand(frontendWorkspaceName, "install")
  if (target.kind === "service") return runWorkspaceCommand(getServiceWorkspaceName(target.name), "install")
  if (target.kind === "gateway") return runWorkspaceCommand(getGatewayWorkspaceName(target.name), "install")

  throw new Error(`Неподдерживаемая цель установки: ${target.raw}`)
}

function handleDevelopment(args) {
  const target = getTarget(args, "all")

  if (target.kind === "all") {
    return runInSeparateWindows([
      ...getDevelopmentServiceWorkspaceNames().map((workspaceName) => createWorkspaceCommand(workspaceName, "start")),
      ...getAllGatewayWorkspaceNames().map((workspaceName) => createWorkspaceCommand(workspaceName, "start")),
      createWorkspaceCommand(frontendWorkspaceName, "serve")
    ])
  }

  if (target.kind === "frontend") return runInSeparateWindows([createWorkspaceCommand(frontendWorkspaceName, "serve")])
  if (target.kind === "service") return runInSeparateWindows([createWorkspaceCommand(getServiceWorkspaceName(target.name), "start")])
  if (target.kind === "gateway") return runInSeparateWindows([createWorkspaceCommand(getGatewayWorkspaceName(target.name), "start")])

  throw new Error(`Неподдерживаемая цель запуска: ${target.raw}`)
}

function handleBuild(args) {
  const target = getTarget(args, "all")

  if (target.kind === "all") {
    return runSequential([
      ...getAllServiceWorkspaceNames().map((workspaceName) => createWorkspaceCommand(workspaceName, "build")),
      ...getAllGatewayWorkspaceNames().map((workspaceName) => createWorkspaceCommand(workspaceName, "build")),
      createWorkspaceCommand(frontendWorkspaceName, "build")
    ])
  }

  if (target.kind === "frontend") return runWorkspaceCommand(frontendWorkspaceName, "build")
  if (target.kind === "service") return runWorkspaceCommand(getServiceWorkspaceName(target.name), "build")
  if (target.kind === "gateway") return runWorkspaceCommand(getGatewayWorkspaceName(target.name), "build")

  throw new Error(`Неподдерживаемая цель сборки: ${target.raw}`)
}

function handleTypecheck(args) {
  const target = getTarget(args, "all")

  if (target.kind === "all") {
    return runSequential([
      createSharedTypecheckCommand(),
      ...getAllServiceWorkspaceNames().map((workspaceName) => createWorkspaceCommand(workspaceName, "typecheck")),
      ...getAllGatewayWorkspaceNames().map((workspaceName) => createWorkspaceCommand(workspaceName, "typecheck")),
      createWorkspaceCommand(frontendWorkspaceName, "typecheck")
    ])
  }

  if (target.kind === "shared") return runCommand(createSharedTypecheckCommand())
  if (target.kind === "frontend") return runWorkspaceCommand(frontendWorkspaceName, "typecheck")
  if (target.kind === "service") return runWorkspaceCommand(getServiceWorkspaceName(target.name), "typecheck")
  if (target.kind === "gateway") return runWorkspaceCommand(getGatewayWorkspaceName(target.name), "typecheck")

  throw new Error(`Неподдерживаемая цель проверки типов: ${target.raw}`)
}

function handleStartDist(args) {
  const target = getTarget(args, "service", "monolith")

  if (target.kind === "service") return runWorkspaceCommand(getServiceWorkspaceName(target.name), "start:dist")
  if (target.kind === "gateway") return runWorkspaceCommand(getGatewayWorkspaceName(target.name), "start:dist")

  throw new Error("Production bundle запускается только для backend-сервиса или gateway")
}

function handleMigrate(args) {
  const [mode = "dev"] = args

  if (mode === "dev") return runWorkspaceCommand(getServiceWorkspaceName("database-migration"), "start")
  if (mode === "dist") return runWorkspaceCommand(getServiceWorkspaceName("database-migration"), "start:dist")

  throw new Error("Формат команды: migrate [dev|dist]")
}

function runLocalhostDatabaseReset() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Пересоздание базы данных запрещено в production-среде")
  }

  const migrationWorkspaceName = getServiceWorkspaceName("database-migration")
  const migrationWorkspaceDirectory = getWorkspaceDirectory(migrationWorkspaceName)

  updateRuntimeDevelopmentEnvFiles(migrationWorkspaceDirectory)

  return runSequential([
    createWorkspaceCommand(migrationWorkspaceName, "drop-database"),
    createWorkspaceCommand(migrationWorkspaceName, "setup"),
    createWorkspaceCommand(migrationWorkspaceName, "start"),
    createWorkspaceCommand(migrationWorkspaceName, "grant-runtime"),
    createWorkspaceCommand(migrationWorkspaceName, "seed-development")
  ])
}

function handleLocalhost(args) {
  const options = parseLocalhostOptions(args)

  const migrationWorkspaceName = getServiceWorkspaceName("database-migration")
  const migrationWorkspaceDirectory = getWorkspaceDirectory(migrationWorkspaceName)
  const adminCredentials = getLocalhostDatabaseAdminCredentials(options.credentials, migrationWorkspaceDirectory)

  return Promise.resolve()
    .then(() => {
      writeLocalhostDevelopmentEnvFiles(adminCredentials.userName, adminCredentials.password, options)
    })
    .then(() => runLocalhostDatabaseReset())
    .then(() => handleDevelopment(["all"]))
}

function parseLocalhostOptions(args) {
  const noNginxFlags = new Set(["noNginx", "--noNginx", "--no-nginx"])
  const noNginx = args.some((arg) => noNginxFlags.has(arg))
  const credentials = args.filter((arg) => !noNginxFlags.has(arg))

  if (credentials.length !== 0 && credentials.length !== 2) {
    throw new Error("Формат команды: localhost [noNginx] [db-root-user db-root-password]")
  }

  return {
    noNginx,
    credentials
  }
}

function handleWorkspace(args) {
  const [targetName, scriptName, ...scriptArgs] = args

  if (!targetName || !scriptName) {
    throw new Error("Формат команды: workspace <workspace|frontend|service:name|gateway:name> <script> [...args]")
  }

  return runWorkspaceCommand(resolveWorkspaceName(targetName), scriptName, scriptArgs)
}

function getTarget(args, defaultKind, defaultName) {
  const [kind = defaultKind, name = defaultName] = args

  if (kind === "all") return { kind: "all", raw: kind }
  if (kind === "shared") return { kind: "shared", raw: kind }
  if (kind === "frontend" || kind === "monolith") return { kind: "frontend", raw: kind }
  if (kind === "service") return { kind: "service", name: name || "monolith", raw: `${kind} ${name || "monolith"}` }
  if (kind === "gateway") return { kind: "gateway", name: name || "monolith", raw: `${kind} ${name || "monolith"}` }
  if (kind.startsWith("service:")) return { kind: "service", name: kind.slice("service:".length), raw: kind }
  if (kind.startsWith("gateway:")) return { kind: "gateway", name: kind.slice("gateway:".length), raw: kind }

  return { kind, name, raw: args.join(" ") }
}

function getPackageWorkspaceNames(packagesDirectory) {
  if (!existsSync(packagesDirectory)) return new Map()

  return new Map(readdirSync(packagesDirectory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const packageName = entry.name
      const workspaceName = getPackageName(join(packagesDirectory, packageName))
      return [packageName, workspaceName]
    })
    .filter((entry) => Boolean(entry[1])))
}

function getPackageWorkspaceOptions(packagesDirectory) {
  if (!existsSync(packagesDirectory)) return new Map()

  return new Map(readdirSync(packagesDirectory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const packageDirectory = join(packagesDirectory, entry.name)
      const packageJson = getPackageJson(packageDirectory)
      return [
        packageJson?.name,
        {
          runWithDevAll: packageJson?.boilerplate?.runWithDevAll !== false
        }
      ]
    })
    .filter(([workspaceName]) => Boolean(workspaceName)))
}

function getServiceWorkspaceName(serviceName) {
  const workspaceName = serviceWorkspaceNames.get(serviceName)

  if (!workspaceName) {
    throw new Error(`Backend-сервис не найден: ${serviceName}`)
  }

  return workspaceName
}

function getGatewayWorkspaceName(gatewayName) {
  const workspaceName = gatewayWorkspaceNames.get(gatewayName)

  if (!workspaceName) {
    throw new Error(`Gateway не найден: ${gatewayName}`)
  }

  return workspaceName
}

function getAllServiceWorkspaceNames() {
  return Array.from(serviceWorkspaceNames.values())
}

function getDevelopmentServiceWorkspaceNames() {
  return getAllServiceWorkspaceNames()
    .filter((workspaceName) => serviceWorkspaceOptions.get(workspaceName)?.runWithDevAll !== false)
}

function getAllGatewayWorkspaceNames() {
  return Array.from(gatewayWorkspaceNames.values())
}

function resolveWorkspaceName(targetName) {
  if (targetName === "frontend" || targetName === "monolith") return frontendWorkspaceName
  if (targetName.startsWith("service:")) return getServiceWorkspaceName(targetName.slice("service:".length))
  if (targetName.startsWith("gateway:")) return getGatewayWorkspaceName(targetName.slice("gateway:".length))
  if ([frontendWorkspaceName, ...serviceWorkspaceNames.values(), ...gatewayWorkspaceNames.values()].includes(targetName)) return targetName

  throw new Error(`Workspace не найден: ${targetName}`)
}

function getPackageName(packageDirectory) {
  return getPackageJson(packageDirectory)?.name || null
}

function getPackageJson(packageDirectory) {
  const packageJsonPath = join(packageDirectory, "package.json")
  if (!existsSync(packageJsonPath)) return null

  return JSON.parse(readFileSync(packageJsonPath, "utf-8"))
}

function createSharedTypecheckCommand() {
  const executable = getLocalBinaryPath("tsc")

  return {
    command: executable,
    args: ["-p", "shared/tsconfig.json", "--noEmit"]
  }
}

function createWorkspaceCommand(workspaceName, scriptName, scriptArgs = []) {
  const cwd = getWorkspaceDirectory(workspaceName)

  return {
    command: "npm",
    args: ["run", scriptName, ...scriptArgs],
    workspaceName,
    cwd,
    env: getPackageLocalEnv(cwd, scriptName)
  }
}

function runWorkspaceCommand(workspaceName, scriptName, scriptArgs = []) {
  return runCommand(createWorkspaceCommand(workspaceName, scriptName, scriptArgs))
}

function runSequential(commandList) {
  return commandList.reduce(
    (chain, command) => chain.then(() => runCommand(command)),
    Promise.resolve()
  )
}

function runParallel(commandList) {
  return Promise.all(commandList.map((command) => runCommand(command)))
}

function runInSeparateWindows(commandList) {
  if (process.platform !== "win32") {
    return runParallel(commandList)
  }

  const children = commandList.map((command) => runCommandInSeparateWindow(command))
  return waitForSeparateWindowProcesses(children)
}

function runCommandInSeparateWindow(command) {
  if (process.platform !== "win32") {
    return runCommand(command)
  }

  const escapedCommand = [command.command, ...command.args].map(escapeCmdArgument).join(" ")
  const windowTitle = getCommandWindowTitle(command)
  const workingDirectory = resolve(command.cwd || rootDirectory)
  const commandToKeepOpen = `title ${escapeCmdTitle(windowTitle)} && ${escapedCommand}`

  const child = spawn("cmd.exe", ["/d", "/k", commandToKeepOpen], {
    cwd: workingDirectory,
    detached: true,
    env: command.env || process.env,
    stdio: "ignore",
    windowsHide: false
  })

  return child
}

function waitForSeparateWindowProcesses(children) {
  if (!children.length) return Promise.resolve()

  const aliveChildren = new Set(children)

  console.log("Dev-процессы запущены в отдельных окнах. Нажмите Ctrl+C здесь, чтобы остановить все запущенные окна.")

  return new Promise((resolvePromise, rejectPromise) => {
    let isStopping = false

    const cleanup = () => {
      process.off("SIGINT", stop)
      process.off("SIGTERM", stop)
    }

    const finishIfDone = () => {
      if (aliveChildren.size > 0) return
      cleanup()
      resolvePromise()
    }

    const stop = () => {
      if (isStopping) return
      isStopping = true

      console.log("Останавливаю dev-процессы...")

      stopSeparateWindowProcesses(Array.from(aliveChildren))
        .then(() => {
          cleanup()
          resolvePromise()
        })
        .catch((error) => {
          cleanup()
          rejectPromise(error)
        })
    }

    children.forEach((child) => {
      child.on("exit", () => {
        aliveChildren.delete(child)
        finishIfDone()
      })

      child.on("error", (error) => {
        aliveChildren.delete(child)
        cleanup()
        rejectPromise(error)
      })
    })

    process.on("SIGINT", stop)
    process.on("SIGTERM", stop)
    process.stdin.resume()
  })
}

function stopSeparateWindowProcesses(children) {
  return Promise.all(children.map((child) => stopProcessTree(child.pid)))
    .then(() => undefined)
}

function stopProcessTree(pid) {
  if (!pid) return Promise.resolve()

  if (process.platform !== "win32") {
    process.kill(-pid, "SIGTERM")
    return Promise.resolve()
  }

  return new Promise((resolvePromise) => {
    const child = spawn("taskkill", ["/PID", String(pid), "/T", "/F"], {
      stdio: "ignore",
      windowsHide: true
    })

    child.on("exit", () => resolvePromise())
    child.on("error", () => resolvePromise())
  })
}

function runCommand(command) {
  return run(command.command, command.args, command.cwd, command.env)
}

function run(command, args, cwd = rootDirectory, env = process.env) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, {
      cwd,
      env,
      shell: true,
      stdio: "inherit"
    })

    child.on("exit", (code) => {
      if (code === 0) {
        resolvePromise()
        return
      }

      rejectPromise(new Error(`Команда завершилась с кодом ${code}: ${command} ${args.join(" ")}`))
    })

    child.on("error", rejectPromise)
  })
}

function getLocalBinaryPath(binaryName) {
  const executableName = process.platform === "win32" ? `${binaryName}.cmd` : binaryName
  const executablePath = resolve(rootDirectory, "node_modules", ".bin", executableName)

  if (!existsSync(executablePath)) {
    throw new Error(`Не найден ${executableName}. Сначала установите зависимости командой: npm run project -- install`)
  }

  return executablePath
}

function getPackageLocalEnv(packageDirectory, scriptName) {
  const envFileName = getPackageLocalEnvFileName(scriptName)
  const envFilePath = join(packageDirectory, envFileName)

  if (!existsSync(envFilePath)) return process.env

  return {
    ...process.env,
    ...parseEnvFile(readFileSync(envFilePath, "utf-8"))
  }
}

function getPackageLocalEnvFileName(scriptName) {
  if (
    process.env.NODE_ENV === "production" ||
    scriptName === "build" ||
    scriptName === "start:dist" ||
    scriptName.endsWith(":dist")
  ) {
    return ".prod.env"
  }

  return ".dev.env"
}

function parseEnvFile(data) {
  return data
    .split(/\r?\n/)
    .map((row) => row.trim())
    .filter((row) => row && !row.startsWith("#"))
    .reduce((env, row) => {
      const separatorIndex = row.indexOf("=")
      if (separatorIndex === -1) return env

      const key = row.slice(0, separatorIndex).trim()
      const value = row.slice(separatorIndex + 1).trim()

      if (key) env[key] = value
      return env
    }, {})
}

function updateRuntimeDevelopmentEnvFiles(migrationWorkspaceDirectory) {
  const migrationEnv = getPackageLocalEnv(migrationWorkspaceDirectory, "start")
  const runtimeUsers = parseRuntimeUsers(migrationEnv.VAR_DB_RUNTIME_GRANTS)

  runtimeUsers.forEach((runtimeUser) => {
    const packageDirectory = resolveRuntimeUserPackageDirectory(runtimeUser.userName)
    if (!packageDirectory) return

    const envFilePath = join(packageDirectory, ".dev.env")
    if (!existsSync(envFilePath)) return

    const nextValues = {
      VAR_DB_HOST: migrationEnv.VAR_DB_HOST,
      VAR_DB_NAME: migrationEnv.VAR_DB_NAME,
      VAR_DB_USER: runtimeUser.userName,
      VAR_DB_PASSWORD: runtimeUser.password
    }

    writeFileSync(envFilePath, updateEnvFile(readFileSync(envFilePath, "utf-8"), nextValues), "utf-8")
    console.log(`Обновлен development env: ${envFilePath}`)
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
    throw new Error("Укажите root-доступ к MySQL: npm run project -- localhost <db-root-user> <db-root-password>")
  }

  return { userName, password }
}

function writeLocalhostDevelopmentEnvFiles(databaseAdminUserName, databaseAdminPassword, options = {}) {
  const runtimeUsers = getDatabaseRuntimeUserConfigItems()
  const localhostPackagePorts = getLocalhostPackagePorts()
  const runtimeGrants = runtimeUsers.map((runtimeUser) => ({
    userName: runtimeUser.userName,
    password: runtimeUser.password,
    host: "localhost",
    grants: runtimeUser.grants
  }))

  writeDevelopmentEnvFile(join(servicesDirectory, "database-migration"), {
    VAR_APP_LOG_LEVEL: "debug",
    VAR_HTTP_PORT: "8094",
    VAR_HTTP_ORIGIN: getLocalhostHttpOrigin(options),
    VAR_HTTP_COOKIE_NAME: localhostCookieName,
    VAR_HTTP_PUBLIC_USER_COOKIE_NAME: localhostPublicUserCookieName,
    VAR_HTTP_PUBLIC_USER_COOKIE_DOMAIN: localhostPublicUserCookieDomain,
    VAR_HTTP_JWT_SECRET: localhostJwtSecret,
    VAR_HTTP_JWT_AUDIENCE: localhostJwtAudience,
    VAR_HTTP_JWT_ISSUER: localhostJwtIssuer,
    ...createNoNginxHttpDevelopmentEnv(options),
    VAR_INTERNAL_SERVICE_TOKEN: localhostInternalServiceToken,
    VAR_DB_HOST: "localhost",
    VAR_DB_NAME: localhostDatabaseName,
    VAR_DB_USER: localhostMigrationUser.userName,
    VAR_DB_PASSWORD: localhostMigrationUser.password,
    VAR_DB_ADMIN_USER: databaseAdminUserName,
    VAR_DB_ADMIN_PASSWORD: databaseAdminPassword,
    VAR_DB_SERVICE_HOST: "localhost",
    VAR_DB_SERVICE_GRANTS: "SELECT,INSERT,UPDATE,DELETE,CREATE,ALTER,DROP,INDEX,REFERENCES",
    VAR_DB_RUNTIME_GRANTS: JSON.stringify(runtimeGrants)
  })

  writeLocalhostServiceDevelopmentEnvFiles(runtimeUsers, localhostPackagePorts)
  writeLocalhostGatewayDevelopmentEnvFiles(runtimeUsers, localhostPackagePorts, options)

  writeDevelopmentEnvFile(frontendPackageDirectory, createFrontendDevelopmentEnv(localhostPackagePorts, options))
}

function writeLocalhostServiceDevelopmentEnvFiles(runtimeUsers, localhostPackagePorts) {
  getPackageDirectoryNames(servicesDirectory)
    .filter((packageName) => packageName !== "database-migration")
    .forEach((packageName) => {
      writeLocalhostBackendPackageDevelopmentEnvFile({
        packageKind: "service",
        packageName,
        packageDirectory: join(servicesDirectory, packageName),
        port: getLocalhostPackagePort(localhostPackagePorts, "service", packageName),
        localhostPackagePorts,
        runtimeUsers
      })
    })
}

function writeLocalhostGatewayDevelopmentEnvFiles(runtimeUsers, localhostPackagePorts, options) {
  getPackageDirectoryNames(gatewaysDirectory)
    .forEach((packageName) => {
      writeLocalhostBackendPackageDevelopmentEnvFile({
        packageKind: "gateway",
        packageName,
        packageDirectory: join(gatewaysDirectory, packageName),
        port: getLocalhostPackagePort(localhostPackagePorts, "gateway", packageName),
        localhostPackagePorts,
        runtimeUsers,
        noNginx: options.noNginx
      })
    })
}

function writeLocalhostBackendPackageDevelopmentEnvFile(options) {
  const runtimeUser = options.runtimeUsers.find((item) => item.packageKind === options.packageKind && item.packageName === options.packageName)

  writeDevelopmentEnvFile(options.packageDirectory, {
    ...createHttpDevelopmentEnv(options.port, options),
    ...createBackendDatabaseDevelopmentEnv(runtimeUser),
    ...createBackendCommonDevelopmentEnv(options.packageKind, options.packageName),
    ...getLocalhostPackageSpecificDevelopmentEnv(options.packageKind, options.packageName, options.localhostPackagePorts)
  })
}

function createBackendDatabaseDevelopmentEnv(runtimeUser) {
  if (!runtimeUser) return {}

  return {
    VAR_DB_HOST: "localhost",
    VAR_DB_NAME: localhostDatabaseName,
    VAR_DB_USER: runtimeUser.userName,
    VAR_DB_PASSWORD: runtimeUser.password
  }
}

function getLocalhostPackageSpecificDevelopmentEnv(packageKind, packageName, localhostPackagePorts) {
  if (packageKind === "service" && packageName === "log-collector") {
    return {
      VAR_LOG_COLLECTOR_CLIENT_ENABLED: "false",
      VAR_LOG_COLLECTOR_SOCKET_PORT: localhostLogCollectorSocketPort
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

function getLocalhostPackagePorts() {
  const usedPorts = new Set()

  return {
    service: getLocalhostPackageKindPorts("service", getPackageDirectoryNames(servicesDirectory)
      .filter((packageName) => packageName !== "database-migration"), usedPorts),
    gateway: getLocalhostPackageKindPorts("gateway", getPackageDirectoryNames(gatewaysDirectory), usedPorts)
  }
}

function getLocalhostPackageKindPorts(packageKind, packageNames, usedPorts) {
  const startPort = packageKind === "gateway" ? 4200 : 4101
  let nextPort = startPort

  return packageNames.reduce((ports, packageName) => {
    const defaultPort = localhostDefaultPackagePorts[packageKind]?.[packageName]
    const port = defaultPort && !usedPorts.has(defaultPort)
      ? defaultPort
      : getNextAvailableLocalhostPort(usedPorts, nextPort)

    usedPorts.add(port)
    nextPort = Number(port) + 1

    return {
      ...ports,
      [packageName]: port
    }
  }, {})
}

function getNextAvailableLocalhostPort(usedPorts, startPort) {
  let port = startPort

  while (usedPorts.has(String(port))) {
    port += 1
  }

  return String(port)
}

function getLocalhostPackagePort(localhostPackagePorts, packageKind, packageName) {
  const port = localhostPackagePorts[packageKind]?.[packageName]
  if (!port) throw new Error(`Не найден localhost port для ${packageKind}/${packageName}`)

  return port
}

function getDatabaseRuntimeUserConfigItems() {
  return getLocalhostRuntimePackageItems()
    .map((packageItem) => {
      const grants = readDatabaseGrantConfig(packageItem)
      if (!grants.length) return null

      return {
        packageKind: packageItem.packageKind,
        packageName: packageItem.packageName,
        userName: createRuntimeUserName(packageItem.packageKind, packageItem.packageName),
        password: createRuntimeUserPassword(packageItem.packageName),
        grants
      }
    })
    .filter(Boolean)
}

function getLocalhostRuntimePackageItems() {
  return [
    ...getPackageDirectoryNames(servicesDirectory)
      .filter((packageName) => packageName !== "database-migration")
      .map((packageName) => ({
        packageKind: "service",
        packageName,
        packageDirectory: join(servicesDirectory, packageName)
      })),
    ...getPackageDirectoryNames(gatewaysDirectory)
      .map((packageName) => ({
        packageKind: "gateway",
        packageName,
        packageDirectory: join(gatewaysDirectory, packageName)
      }))
  ]
}

function readDatabaseGrantConfig(packageItem) {
  const configPath = join(packageItem.packageDirectory, databaseGrantConfigFileName)
  if (!existsSync(configPath)) {
    throw new Error(`Не найден package-local database grants config: ${configPath}`)
  }

  let config

  try {
    config = JSON.parse(readFileSync(configPath, "utf-8"))
  } catch (error) {
    throw new Error(`Некорректный JSON в ${configPath}`)
  }

  if (!config || typeof config !== "object" || Array.isArray(config)) {
    throw new Error(`Database grants config должен быть object: ${configPath}`)
  }

  if (!Array.isArray(config.grants)) {
    throw new Error(`Database grants config должен содержать grants array: ${configPath}`)
  }

  return config.grants.map((grant) => normalizeDatabaseGrant(grant, configPath))
}

function normalizeDatabaseGrant(grant, configPath) {
  if (!grant || typeof grant !== "object" || Array.isArray(grant)) {
    throw new Error(`Database grant должен быть object: ${configPath}`)
  }

  if (typeof grant.table !== "string" || !/^[A-Za-z0-9_]+$/.test(grant.table)) {
    throw new Error(`Некорректное имя таблицы в ${configPath}: ${grant.table}`)
  }

  if (!Array.isArray(grant.operations) || !grant.operations.length) {
    throw new Error(`Database grant должен содержать operations array: ${configPath}.${grant.table}`)
  }

  const operations = grant.operations.map((operation) => {
    if (typeof operation !== "string") {
      throw new Error(`Database grant operation должен быть string: ${configPath}.${grant.table}`)
    }

    return operation.trim().toUpperCase()
  })
    .filter(Boolean)

  operations.forEach((operation) => {
    if (!allowedRuntimeGrantOperations.has(operation)) {
      throw new Error(`Недопустимая runtime operation в ${configPath}: ${operation}`)
    }
  })

  return {
    table: grant.table,
    operations
  }
}

function getPackageDirectoryNames(packagesDirectory) {
  if (!existsSync(packagesDirectory)) return []

  return readdirSync(packagesDirectory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((packageName) => existsSync(join(packagesDirectory, packageName, "package.json")))
    .sort((left, right) => left.localeCompare(right))
}

function createRuntimeUserName(packageKind, packageName) {
  const suffix = packageKind === "gateway" ? "gw" : "svc"
  const normalizedPackageName = normalizePackageNameForDatabaseUser(packageName)
  const maxPackageNameLength = 32 - suffix.length - 1
  const shortenedPackageName = normalizedPackageName.slice(0, maxPackageNameLength).replace(/_+$/g, "")

  return `${shortenedPackageName}_${suffix}`
}

function createRuntimeUserPassword(packageName) {
  return `${normalizePackageNameForDatabaseUser(packageName)}_password`
}

function normalizePackageNameForDatabaseUser(packageName) {
  return packageName.replace(/[^A-Za-z0-9]+/g, "_").replace(/^_+|_+$/g, "")
}

function createHttpDevelopmentEnv(port, options = {}) {
  return {
    VAR_APP_LOG_LEVEL: "debug",
    VAR_HTTP_PORT: port,
    VAR_HTTP_ORIGIN: getLocalhostHttpOrigin(options),
    VAR_HTTP_COOKIE_NAME: localhostCookieName,
    VAR_HTTP_PUBLIC_USER_COOKIE_NAME: localhostPublicUserCookieName,
    VAR_HTTP_PUBLIC_USER_COOKIE_DOMAIN: localhostPublicUserCookieDomain,
    VAR_HTTP_JWT_SECRET: localhostJwtSecret,
    VAR_HTTP_JWT_AUDIENCE: localhostJwtAudience,
    VAR_HTTP_JWT_ISSUER: localhostJwtIssuer,
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

function getLocalhostHttpOrigin(options = {}) {
  return options.noNginx ? localhostNoNginxHttpOrigin : localhostHttpOrigin
}

function createFrontendDevelopmentEnv(localhostPackagePorts, options = {}) {
  if (!options.noNginx) {
    return {
      VUE_APP_BASE_URL: baseUrl,
      VUE_APP_AUTHORIZATION_PUBLIC_USER_COOKIE_NAME: localhostPublicUserCookieName,
      VUE_APP_HOSTNAME: localhostHttpOrigin
    }
  }

  return {
    VUE_APP_BASE_URL: `http://localhost:${getLocalhostPackagePort(localhostPackagePorts, "gateway", "public")}`,
    VUE_APP_AUTHORIZATION_BASE_URL: `http://localhost:${getLocalhostPackagePort(localhostPackagePorts, "gateway", "authorization")}`,
    VUE_APP_FILES_BASE_URL: `http://localhost:${getLocalhostPackagePort(localhostPackagePorts, "gateway", "files")}`,
    VUE_APP_WEBSOCKET_BASE_URL: `http://localhost:${getLocalhostPackagePort(localhostPackagePorts, "gateway", "chat-realtime")}`,
    VUE_APP_AUTHORIZATION_PUBLIC_USER_COOKIE_NAME: localhostPublicUserCookieName,
    VUE_APP_HOSTNAME: localhostNoNginxHttpOrigin
  }
}

function createBackendCommonDevelopmentEnv(packageKind, packageName) {
  return {
    VAR_INTERNAL_SERVICE_TOKEN: localhostInternalServiceToken,
    VAR_LOG_COLLECTOR_CLIENT_ENABLED: "true",
    VAR_LOG_COLLECTOR_SOCKET_HOST: localhostLogCollectorSocketHost,
    VAR_LOG_COLLECTOR_SOCKET_PORT: localhostLogCollectorSocketPort,
    VAR_LOG_SOURCE: `${packageName}-${packageKind}`
  }
}

function writeDevelopmentEnvFile(packageDirectory, values) {
  const envFilePath = join(packageDirectory, ".dev.env")
  const data = Object.entries(values)
    .map(([key, value]) => `${key}=${value}`)
    .join("\n")

  writeFileSync(envFilePath, `${data}\n`, "utf-8")
  console.log(`Обновлен localhost env: ${envFilePath}`)
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

function resolveRuntimeUserPackageDirectory(userName) {
  const packageKind = getRuntimeUserPackageKind(userName)
  const packageName = getRuntimeUserPackageName(userName)

  if (packageKind === "service") {
    return resolvePackageDirectoryByName(servicesDirectory, packageName)
  }

  if (packageKind === "gateway") {
    return resolvePackageDirectoryByName(gatewaysDirectory, packageName)
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

function updateEnvFile(data, nextValues) {
  const pendingKeys = new Set(Object.keys(nextValues))
  const lines = data.split(/\r?\n/)
  const updatedLines = lines.map((line) => {
    const separatorIndex = line.indexOf("=")
    if (separatorIndex === -1) return line

    const key = line.slice(0, separatorIndex).trim()
    if (!pendingKeys.has(key) || typeof nextValues[key] !== "string") return line

    pendingKeys.delete(key)
    return `${key}=${nextValues[key]}`
  })

  pendingKeys.forEach((key) => {
    if (typeof nextValues[key] === "string") updatedLines.push(`${key}=${nextValues[key]}`)
  })

  return updatedLines.join("\n")
}

function getWorkspaceDirectory(workspaceName) {
  if (workspaceName === frontendWorkspaceName) return frontendPackageDirectory

  for (const [serviceName, serviceWorkspaceName] of serviceWorkspaceNames) {
    if (serviceWorkspaceName === workspaceName) return join(servicesDirectory, serviceName)
  }

  for (const [gatewayName, gatewayWorkspaceName] of gatewayWorkspaceNames) {
    if (gatewayWorkspaceName === workspaceName) return join(gatewaysDirectory, gatewayName)
  }

  throw new Error(`Workspace не найден: ${workspaceName}`)
}

function getCommandWindowTitle(command) {
  const runIndex = command.args.indexOf("run")

  if (command.workspaceName && runIndex !== -1) {
    return `${command.workspaceName}:${command.args[runIndex + 1]}`
  }

  return "boilerplate-ts"
}

function escapeCmdArgument(value) {
  if (/^[A-Za-z0-9_./:=-]+$/.test(value)) return value
  return `"${String(value).replace(/"/g, '\\"')}"`
}

function escapeCmdTitle(value) {
  return String(value).replace(/[&|<>^"]/g, "")
}

function showHelp() {
  console.log("Команды проекта:")
  Object.entries(commands).forEach(([name, command]) => {
    console.log(`  ${name.padEnd(12)} ${command.description}`)
  })
  console.log("")
  console.log("Примеры:")
  console.log("  npm run project -- install")
  console.log("  npm run project -- dev")
  console.log("  npm run project -- dev service users")
  console.log("  npm run project -- dev gateway public")
  console.log("  npm run project -- migrate")
  console.log("  npm run project -- migrate dist")
  console.log("  npm run project -- localhost root password")
  console.log("  npm run project -- localhost noNginx root password")
  console.log("  npm run project -- build frontend")
  console.log("  npm run project -- workspace service:users start")
}
