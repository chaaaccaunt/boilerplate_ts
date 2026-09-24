import { resolve } from "path"
import { createBackendPackageWebpackConfig } from "../../scripts/webpack/createBackendPackageWebpackConfig"

const CopyWebpackPlugin = require("copy-webpack-plugin")

const webpackConfig = createBackendPackageWebpackConfig({
  packageKind: "service",
  packageDirectory: __dirname,
  packageName: "notifications",
  entries: { app: { import: resolve(__dirname, "./src/bin/index.ts") } }
})

webpackConfig.plugins?.push(new CopyWebpackPlugin({
  patterns: [{ from: resolve(__dirname, "./certificates"), to: "certificates" }]
}))

export default webpackConfig
