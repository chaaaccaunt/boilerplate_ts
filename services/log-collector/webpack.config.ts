import { resolve } from "path"
import { createBackendPackageWebpackConfig } from "../../scripts/webpack/createBackendPackageWebpackConfig"

export default createBackendPackageWebpackConfig({
  packageKind: "service",
  packageDirectory: __dirname,
  packageName: "log-collector",
  entries: {
    app: {
      import: resolve(__dirname, "./src/bin/index.ts")
    }
  }
})
