import { resolve } from "path"
import TerserPlugin from "terser-webpack-plugin"
import webpack from "webpack"
import type { Configuration } from "webpack"

const optionalRuntimeDependencies = /^(pg|pg-hstore|mariadb|tedious|sqlite3|oracledb|ibm_db|snowflake-sdk|bufferutil|utf-8-validate)$/
const unusedSequelizeDialects = /sequelize[\\/]lib[\\/]dialects[\\/](mariadb|mssql|oracle|postgres|sqlite|db2|snowflake)/
const rootPath = resolve(__dirname, "../..")

const config: Configuration = {
  mode: "production",
  target: "node",
  devtool: false,
  parallelism: 10,
  output: {
    filename: "app.js",
    clean: true,
    library: {
      type: "commonjs2"
    },
    path: resolve(__dirname, "dist")
  },
  entry: {
    app: {
      import: resolve(__dirname, "./src/bin/index.ts"),
    }
  },
  resolve: {
    alias: {
      "@/libs": resolve(rootPath, "libs"),
      "@/models": resolve(rootPath, "models"),
      "@": resolve(__dirname, "src")
    },
    extensions: [".ts", ".js", ".json"]
  },
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        parallel: true,
        extractComments: false,
        terserOptions: {
          ecma: 2020,
          module: false,
          compress: {
            passes: 2
          },
          format: {
            comments: false
          }
        }
      })
    ],
    moduleIds: "deterministic",
    chunkIds: "deterministic",
    mangleExports: "deterministic",
    concatenateModules: true,
    usedExports: true,
    sideEffects: true,
    splitChunks: false,
    runtimeChunk: false,
    emitOnErrors: false
  },
  performance: {
    hints: "warning",
    maxEntrypointSize: 5 * 1024 * 1024,
    maxAssetSize: 5 * 1024 * 1024
  },
  stats: {
    preset: "normal"
  },
  ignoreWarnings: [
    /Critical dependency: the request of a dependency is an expression/
  ],
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: [
          {
            loader: "babel-loader",
            options: {
              babelrc: false,
              configFile: false,
              presets: [
                [
                  "@babel/preset-env",
                  {
                    targets: {
                      node: "current"
                    },
                    modules: false,
                    bugfixes: true
                  }
                ]
              ]
            }
          },
          {
            loader: "ts-loader"
          }
        ]
      }
    ]
  },
  plugins: [
    new webpack.IgnorePlugin({
      resourceRegExp: optionalRuntimeDependencies
    }),
    new webpack.IgnorePlugin({
      checkResource(resource) {
        return unusedSequelizeDialects.test(resource)
      }
    })
  ]
}

export default config
