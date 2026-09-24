const { readFileSync, writeFileSync } = require("fs")
const { join } = require("path")
const { getLocalhostPackagePort } = require("./package-config")

const apiTemplateFileName = "development.api.template.conf"
const frontendTemplateFileName = "development.frontend.template.conf"

function writeDevelopmentNginxConfigFiles(config, localhostPackagePorts) {
  const frontendEndpoint = parseDevelopmentEndpoint(config.localhostHttpOrigin, "localhost.httpOrigin")
  const apiEndpoint = parseDevelopmentEndpoint(config.baseUrl, "localhost.baseUrl")

  validateDistinctEndpoints(frontendEndpoint, apiEndpoint)

  writeNginxConfig(config, apiTemplateFileName, "development.api.conf", {
    ALLOWED_ORIGIN: frontendEndpoint.origin,
    API_LISTEN_PORT: apiEndpoint.listenPort,
    API_SERVER_NAME: apiEndpoint.hostname,
    AUTHORIZATION_GATEWAY_PORT: getLocalhostPackagePort(localhostPackagePorts, "gateway", "authorization"),
    CHAT_REALTIME_GATEWAY_PORT: getLocalhostPackagePort(localhostPackagePorts, "gateway", "chat-realtime"),
    FILES_GATEWAY_PORT: getLocalhostPackagePort(localhostPackagePorts, "gateway", "files"),
    PUBLIC_GATEWAY_PORT: getLocalhostPackagePort(localhostPackagePorts, "gateway", "public")
  })

  writeNginxConfig(config, frontendTemplateFileName, "development.frontend.conf", {
    FRONTEND_LISTEN_PORT: frontendEndpoint.listenPort,
    FRONTEND_SERVER_NAME: frontendEndpoint.hostname,
    FRONTEND_UPSTREAM_PORT: config.localhostFrontendDevServerPort
  })
}

function parseDevelopmentEndpoint(value, configPath) {
  let url

  try {
    url = new URL(value)
  } catch (error) {
    throw new Error(`В development config значение ${configPath} должно быть абсолютным HTTP URL`)
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`В development config значение ${configPath} должно использовать протокол http или https`)
  }

  if (url.username || url.password) {
    throw new Error(`В development config значение ${configPath} не должно содержать credentials`)
  }

  if (url.pathname !== "/" || url.search || url.hash) {
    throw new Error(`В development config значение ${configPath} не должно содержать path, query или hash`)
  }

  return {
    hostname: url.hostname,
    listenPort: url.port || "80",
    origin: url.origin
  }
}

function validateDistinctEndpoints(frontendEndpoint, apiEndpoint) {
  if (frontendEndpoint.hostname === apiEndpoint.hostname && frontendEndpoint.listenPort === apiEndpoint.listenPort) {
    throw new Error("localhost.httpOrigin и localhost.baseUrl должны использовать разные hostname или port для раздельных nginx server blocks")
  }
}

function writeNginxConfig(config, templateFileName, outputFileName, values) {
  const templatePath = join(config.nginxDirectory, templateFileName)
  const outputPath = join(config.nginxDirectory, outputFileName)
  const template = readFileSync(templatePath, "utf-8")
  const output = Object.entries(values).reduce(
    (result, [key, value]) => result.split(`{{${key}}}`).join(String(value)),
    template
  )

  const unresolvedPlaceholder = output.match(/\{\{[A-Z0-9_]+\}\}/)
  if (unresolvedPlaceholder) {
    throw new Error(`Не задано значение nginx template placeholder ${unresolvedPlaceholder[0]} в ${templatePath}`)
  }

  writeFileSync(outputPath, output, "utf-8")
  console.log(`Сгенерирован nginx config: ${outputPath}`)
}

module.exports = {
  writeDevelopmentNginxConfigFiles
}
