import { existsSync, readFileSync } from "fs"
import { resolve } from "path"

const prefix = process.env.NODE_ENV === "production" ? ".prod" : ".dev"

export class Envs {
  static assignEnv() {
    const data = this.getEnvFileData()
    if (data) this.readEnvFile(data.data)
  }

  static getEnvFileData() {
    const exist = resolve(process.cwd(), `${prefix}.env`)
    if (existsSync(exist)) return { path: exist, data: readFileSync(exist, "utf-8") }

    throw new Error(`Не найден package-local env-файл: ${exist}`)
  }

  private static readEnvFile(data: string) {
    const rows = data.split("\n")
    const comment = new RegExp(/^#/)
    rows.forEach((row) => {
      if (!row || comment.test(row)) return
      const separator = row.indexOf("=")
      if (separator === -1) return
      const key = row.slice(0, separator).trim()
      const value = row.slice(separator + 1).trim()
      if (!key || !value) return
      process.env[key] = value
    })
  }
}
