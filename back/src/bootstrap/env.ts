import { existsSync, readFileSync, writeFileSync } from "fs"
import { resolve } from "path"

const prefix = process.env.NODE_ENV === "production" ? ".prod" : ".dev"

export function assignEnv() {
  const data = getEnvFileData()
  if (data) readEnvFile(data.data)
}

export function getEnvFileData() {
  let cwd = process.cwd()
  for (let i = 0; i < 9; i++) {
    const exist = resolve(cwd, `${prefix}.env`)
    if (existsSync(exist)) return { path: exist, data: readFileSync(exist, "utf-8") }
    else cwd = resolve(cwd, "..")
  }
  writeFileSync(resolve(process.cwd(), `${prefix}.env`), "")
}

function readEnvFile(data: string) {
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