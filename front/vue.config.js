const { defineConfig } = require('@vue/cli-service')

function getExternalDevServerConfig() {
  const hostname = process.env.VUE_APP_HOSTNAME

  if (!hostname) return {}

  const url = new URL(hostname)
  const isHttps = url.protocol === 'https:'

  return {
    allowedHosts: [url.hostname],
    client: {
      webSocketURL: {
        protocol: isHttps ? 'wss' : 'ws',
        hostname: url.hostname,
        port: url.port ? Number(url.port) : isHttps ? 443 : 80,
        pathname: '/ws'
      }
    }
  }
}

module.exports = defineConfig({
  transpileDependencies: true,
  devServer: {
    host: '0.0.0.0',
    ...getExternalDevServerConfig()
  }
})
