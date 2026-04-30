import type { iDefaultEnvs } from "@/bin"
import type { iBootstrapEnv } from "@/bootstrap";

declare global {
  declare namespace NodeJS {
    interface ProcessEnv extends iBootstrapEnv { }
  }
}