import { resolve } from "path"
import { createBackendPackageWebpackConfig } from "../../scripts/webpack/createBackendPackageWebpackConfig"

export default createBackendPackageWebpackConfig({
  packageKind: "service",
  packageDirectory: __dirname,
  packageName: "users",
  entries: {
    app: {
      import: resolve(__dirname, "./src/bin/index.ts")
    }
  }
})
