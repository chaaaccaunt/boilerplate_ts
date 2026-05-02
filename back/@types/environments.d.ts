import type { iDefaultEnvs } from "@/bin"
import type { iDatabaseEnv } from "@/database"
import type { iLibsEnv } from "@/libs"

declare global {
  declare namespace NodeJS {
    interface ProcessEnv extends iDefaultEnvs, iDatabaseEnv, iLibsEnv { }
  }
}
