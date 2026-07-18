const { defineConfig } = require('@vue/cli-service')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const { resolve } = require('path')

function getExternalDevServerConfig() {
  const hostname = process.env.VUE_APP_HOSTNAME

  if (!hostname || hostname === "УкажитеЗначение") return {}

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
  outputDir: resolve(__dirname, '../build/monolith'),
  configureWebpack: {
    plugins: [
      new CopyWebpackPlugin({
        patterns: [
          {
            from: resolve(__dirname, process.env.NODE_ENV === "production" ? '.prod.env' : '.dev.env'),
            to: '.prod.env'
          }
        ]
      })
    ]
  },
  devServer: {
    host: '0.0.0.0',
    ...getExternalDevServerConfig()
  }
})
