import { Middlewares } from "@/middlewares"
import { UUID } from "crypto"

declare global {
  interface iCommonValues {
    optional?: boolean
  }

  interface iPrimitiveTypesValue {
    number: {
      min: number,
      max?: number
    }
    string: {
      minLength: number
      maxLength?: number
      reg?: RegExp
    }
    boolean: boolean
  }

  interface iPrimitive {
    number?: iPrimitiveTypesValue["number"]
    string?: iPrimitiveTypesValue["string"]
    boolean?: iPrimitiveTypesValue["boolean"]
    asNumber?: boolean
  }

  interface iValidator extends iCommonValues {
    isArray?: Omit<iValidator, "isArray">
    isPrimitive?: iPrimitive
    isEmail?: boolean
    isObject?: {
      [key: string]: iValidator
    }
  }

  type iMiddlewares = ("httpTokenValidator" | "payloadValidator" | "httpRoleValidator")

  interface iRoute<T extends iMiddlewares = iMiddlewares> {
    url: RegExp
    method: "GET" | "POST" | "PATCH" | "DELETE"
    middlewares: T[]
    callback: (request: IncomingMessage, response: ServerResponse) => void
    roles?: T extends "httpRoleValidator" ? iRoleId[] : undefined
    validator?: { [key: string]: iValidator }
    rawBody?: boolean
  }

  interface iUserToken {
    uid: UUID
    staffId: number
    organizationId: number
    departmentId: number | null
    roles: iRoleId[]
  }
}
