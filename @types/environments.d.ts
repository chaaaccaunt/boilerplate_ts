import type { iDefaultEnvs } from "@/bin"

declare global {
  declare namespace NodeJS {
    interface ProcessEnv extends iDefaultEnvs {
    }
  }
}