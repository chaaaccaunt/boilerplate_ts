import { resolve } from "path"
import { createBackendPackageWebpackConfig } from "../../scripts/webpack/createBackendPackageWebpackConfig"

export default createBackendPackageWebpackConfig({
  packageKind: "gateway",
  packageDirectory: __dirname,
  packageName: "public",
  entries: {
    app: {
      import: resolve(__dirname, "./src/bin/index.ts")
    }
  }
})
