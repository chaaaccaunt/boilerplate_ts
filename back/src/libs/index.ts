import { iHTTPServerEnv } from "./HTTPServer";
import { iLoggerEnv } from "./Logger";

export interface iLibsEnv extends iLoggerEnv, iHTTPServerEnv { }

export { PayloadValidator } from "./Validator"
export { HTTPServer, iHTTPServerEnv } from "./HTTPServer"