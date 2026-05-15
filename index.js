const { existsSync, readdirSync, readFileSync } = require("fs")
const { join, resolve } = require("path")
const { spawn } = require("child_process")

const rootDirectory = __dirname
const frontendPackageDirectory = join(rootDirectory, "monolith")
const servicesDirectory = join(rootDirectory, "services")
const gatewaysDirectory = join(rootDirectory, "gateways")

const frontendWorkspaceName = getPackageName(frontendPackageDirectory)
const serviceWorkspaceNames = getPackageWorkspaceNames(servicesDirectory)
const gatewayWorkspaceNames = getPackageWorkspaceNames(gatewaysDirectory)

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
      ...getAllServiceWorkspaceNames().map((workspaceName) => createWorkspaceCommand(workspaceName, "start")),
      ...getAllGatewayWorkspaceNames().map((workspaceName) => createWorkspaceCommand(workspaceName, "start")),
      createWorkspaceCommand(frontendWorkspaceName, "serve")
    ])
  }

  if (target.kind === "frontend") return runCommandInSeparateWindow(createWorkspaceCommand(frontendWorkspaceName, "serve"))
  if (target.kind === "service") return runCommandInSeparateWindow(createWorkspaceCommand(getServiceWorkspaceName(target.name), "start"))
  if (target.kind === "gateway") return runCommandInSeparateWindow(createWorkspaceCommand(getGatewayWorkspaceName(target.name), "start"))

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
  const packageJsonPath = join(packageDirectory, "package.json")

  if (!existsSync(packageJsonPath)) return null

  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"))
  return packageJson.name
}

function createSharedTypecheckCommand() {
  const executable = getLocalBinaryPath("tsc")

  return {
    command: executable,
    args: ["-p", "shared/tsconfig.json", "--noEmit"]
  }
}

function createWorkspaceCommand(workspaceName, scriptName, scriptArgs = []) {
  return {
    command: "npm",
    args: ["run", scriptName, ...scriptArgs],
    workspaceName,
    cwd: getWorkspaceDirectory(workspaceName)
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
  commandList.forEach((command) => runCommandInSeparateWindow(command))
  return Promise.resolve()
}

function runCommandInSeparateWindow(command) {
  if (process.platform !== "win32") {
    return runCommand(command)
  }

  const escapedCommand = [command.command, ...command.args].map(escapeCmdArgument).join(" ")
  const windowTitle = getCommandWindowTitle(command)
  const workingDirectory = resolve(command.cwd || rootDirectory)
  const commandToKeepOpen = `title ${escapeCmdTitle(windowTitle)} && ${escapedCommand}`

  spawn("cmd.exe", ["/d", "/k", commandToKeepOpen], {
    cwd: workingDirectory,
    detached: true,
    stdio: "ignore",
    windowsHide: false
  }).unref()

  return Promise.resolve()
}

function runCommand(command) {
  return run(command.command, command.args, command.cwd)
}

function run(command, args, cwd = rootDirectory) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, {
      cwd,
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
  console.log("  npm run project -- dev service monolith")
  console.log("  npm run project -- dev gateway monolith")
  console.log("  npm run project -- build frontend")
  console.log("  npm run project -- workspace service:monolith start")
}
