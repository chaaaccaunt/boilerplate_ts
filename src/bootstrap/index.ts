import { iDatabaseEnv } from "@/database"
import { iLibsEnv } from "@/libs"
import { iDefaultEnvs } from "@/bin"

export interface iBootstrapEnv extends iDefaultEnvs, iLibsEnv, iDatabaseEnv { }

import { assignEnv } from "./env"
import { AppConfiguration } from "./config"

assignEnv()

const configInstance = new AppConfiguration()

export const config = configInstance.deepFreeze(configInstance.config)
