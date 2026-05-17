import { UUID } from "crypto"
import type { IncomingHttpHeaders } from "http"

declare global {
  namespace iContracts {

    interface iUserToken {
      uid: UUID,
      claims?: iPayload
    }

    type iRequestBodyType = "json" | "multipart"
    type iPayloadValue = string | number | boolean | null | iPayload | iPayloadValue[]
    type iPayload = Record<string, iPayloadValue>
    type iRequestBody = iPayload | iMultipartPayload

    interface iUploadedFile {
      fieldName: string
      originalName: string
      mimeType: string
      encoding: string
      size: number
      storagePath: string
    }

    interface iMultipartPayload {
      fields: iPayload
      files: iUploadedFile[]
    }

    interface iCookieOptions {
      httpOnly?: boolean
      secure?: boolean
      sameSite?: "strict" | "lax" | "none"
      path?: string
      domain?: string
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

    interface iFileControllerResult {
      file: {
        path: string
        originalName: string
        mimeType: string
        disposition?: "attachment" | "inline"
        range?: string
      }
    }

    type iApiError = iSharedApi.ErrorDto
    type iApiResponse<TResult = unknown> = iSharedApi.ResponseEnvelope<TResult>

    interface iRequestContextPayload<TData = iContracts.iPayload> {
      requestId: string
      user?: iContracts.iUserToken
      headers: IncomingHttpHeaders
      data?: TData
    }

    interface iMicroServiceRequestPayload<TData = iContracts.iPayload> {
      requestId: string
      data?: TData
    }

    type iRouteCallback<TPayload = iRequestContextPayload, R = unknown> = {
      bivarianceHack(payload: TPayload): Promise<R>
    }["bivarianceHack"] & {
      controllerName: string
      controllerMethod: string
    }

    interface iRoute<P = iContracts.iRequestBody, R = unknown> {
      url: RegExp
      method: "GET" | "POST" | "PATCH" | "DELETE"
      requireAuthorization?: boolean
      requestBodyType?: iRequestBodyType
      clearCookiesOnError?: string[]
      callback: iRouteCallback<iRequestContextPayload<P>, R>
      validator?: { [key: string]: iValidator }
    }

    type iMicroServiceRouteCallback<TPayload = iMicroServiceRequestPayload, R = unknown> = {
      bivarianceHack(payload: TPayload): Promise<R>
    }["bivarianceHack"] & {
      serviceName: string
      serviceMethod: string
    }

    interface iMicroServiceRoute<P = iContracts.iRequestBody, R = unknown> {
      url: RegExp
      method: "GET" | "POST" | "PATCH" | "DELETE"
      callback: iMicroServiceRouteCallback<iMicroServiceRequestPayload<P>, R>
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

    interface iLoginControllerPayload {
      data?: iLoginPayload
    }

    interface iLogoutControllerPayload {
      user?: iContracts.iUserToken
    }

    interface iStateControllerPayload {
      user?: iContracts.iUserToken
    }

    interface iLoginResult {
      user: iSharedAuthorization.LoginResponseDto
      accessToken: string
    }
  }
}

