import { Middlewares } from "@/middlewares"
import { UUID } from "crypto"

declare global {
  namespace iContracts {

    interface iUserToken {
      uid: UUID,
      claims?: iPayload
    }

    type iMiddlewares = ("httpTokenValidator" | "payloadValidator")
    type iPayloadValue = string | number | boolean | null | iPayload | iPayloadValue[]
    type iPayload = Record<string, iPayloadValue>

    interface iCookieOptions {
      httpOnly?: boolean
      secure?: boolean
      sameSite?: "strict" | "lax" | "none"
      path?: string
      maxAge?: number
    }

    interface iSetCookie {
      name: string
      value: string
      options?: iCookieOptions
    }

    interface iControllerResult<TData = unknown> {
      data: TData
      setCookies?: iSetCookie[]
      clearCookies?: string[]
    }

    type iApiError = iSharedApi.ErrorDto
    type iApiResponse<TResult = unknown> = iSharedApi.ResponseEnvelope<TResult>

    type iRouteCallback<TPayload = { user?: iContracts.iUserToken, data?: iContracts.iPayload }, R = unknown> = {
      bivarianceHack(payload: TPayload): Promise<R>
    }["bivarianceHack"] & {
      controllerName: string
      controllerMethod: string
    }

    interface iRoute<P extends iContracts.iPayload = iContracts.iPayload, R = unknown> {
      url: RegExp
      method: "GET" | "POST" | "PATCH" | "DELETE"
      middlewares: iMiddlewares[]
      clearCookiesOnError?: string[]
      callback: iRouteCallback<{ user?: iContracts.iUserToken, data?: P }, R>
      validator?: { [key: string]: iValidator }
    }

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

    interface iScheme {
      [key: string]: iValidator
    }
  }

  namespace iAuthorization {
    type iLoginPayload = iSharedAuthorization.LoginPayloadDto
    type iPublicUser = iSharedUser.PublicUserDto

    interface iLoginResult {
      user: iSharedAuthorization.LoginResponseDto
      accessToken: string
    }
  }
}

