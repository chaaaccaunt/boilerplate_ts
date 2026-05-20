const { existsSync } = require("fs")
const { resolve } = require("path")
const { spawn } = require("child_process")

function createProcessRunner(config) {
  return {
    run: (command, args, cwd = config.rootDirectory, env = process.env) => run(command, args, cwd, env),
    runCommand,
    runSequential,
    runParallel,
    runInSeparateWindows: (commandList) => runInSeparateWindows(commandList, config),
    getLocalBinaryPath: (binaryName) => getLocalBinaryPath(binaryName, config)
  }
}

function runCommand(command) {
  return run(command.command, command.args, command.cwd, command.env)
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

function runInSeparateWindows(commandList, config) {
  if (process.platform !== "win32") {
    return runParallel(commandList)
  }

  const children = commandList.map((command) => runCommandInSeparateWindow(command, config))
  return waitForSeparateWindowProcesses(children)
}

function runCommandInSeparateWindow(command, config) {
  if (process.platform !== "win32") {
    return runCommand(command)
  }

  const escapedCommand = [command.command, ...command.args].map(escapeCmdArgument).join(" ")
  const windowTitle = getCommandWindowTitle(command)
  const workingDirectory = resolve(command.cwd || config.rootDirectory)
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

function run(command, args, cwd, env) {
  return new Promise((resolvePromise, rejectPromise) => {
    const spawnCommand = getSpawnCommand(command, args)
    const child = spawn(spawnCommand.command, spawnCommand.args, {
      cwd,
      env: getSpawnEnv(env),
      shell: false,
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

function getSpawnCommand(command, args) {
  if (process.platform !== "win32") {
    return { command, args }
  }

  const commandLine = [getWindowsExecutableCommand(command), ...args].map(escapeCmdArgument).join(" ")

  return {
    command: "cmd.exe",
    args: ["/d", "/s", "/c", commandLine]
  }
}

function getWindowsExecutableCommand(command) {
  if (command !== "npm") return command

  return "npm.cmd"
}

function getSpawnEnv(env) {
  return Object.fromEntries(
    Object.entries(env || process.env)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [key, String(value)])
  )
}

function getLocalBinaryPath(binaryName, config) {
  const executableName = process.platform === "win32" ? `${binaryName}.cmd` : binaryName
  const executablePath = resolve(config.rootDirectory, "node_modules", ".bin", executableName)

  if (!existsSync(executablePath)) {
    throw new Error(`Не найден ${executableName}. Сначала установите зависимости командой: npm run project -- install`)
  }

  return executablePath
}

function getCommandWindowTitle(command) {
  const runIndex = command.args.indexOf("run")

  if (command.workspaceName && runIndex !== -1) {
    return `${command.workspaceName}:${command.args[runIndex + 1]}`
  }

  return "boilerplate-ts"
}

function escapeCmdArgument(value) {
  if (/^[A-Za-z0-9_./:\\=-]+$/.test(value)) return value
  return `"${String(value).replace(/"/g, '""')}"`
}

function escapeCmdTitle(value) {
  return String(value).replace(/[&|<>^"]/g, "")
}

module.exports = {
  createProcessRunner
}
