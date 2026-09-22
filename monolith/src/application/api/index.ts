import { inject, InjectionKey } from "vue"
import { Store } from "vuex"
import { HttpClient } from "@/shared/api"
import { ApiClient } from "./ApiClient"

export const apiClientKey: InjectionKey<ApiClient> = Symbol()

export function createApiClient(store: Store<iSharedState.RootState>): ApiClient {
  const defaultHttpClient = createGatewayHttpClient(getRequiredApiBaseUrl("VUE_APP_BASE_URL"))

  return new ApiClient(
    defaultHttpClient,
    [
      createTransport("/authorization", getOptionalApiBaseUrl("VUE_APP_AUTHORIZATION_BASE_URL"), defaultHttpClient),
      createTransport("/files", getOptionalApiBaseUrl("VUE_APP_FILES_BASE_URL"), defaultHttpClient)
    ],
    store
  )
}

export function useApiClient(): ApiClient {
  const apiClient = inject(apiClientKey)

  if (!apiClient) {
    throw new Error("ApiClient не был передан в приложение")
  }

  return apiClient
}

export { ApiClient }

function createGatewayHttpClient(baseUrl: string): HttpClient {
  return new HttpClient({
    baseUrl: `${baseUrl}/v1/gateway`
  })
}

function createTransport(pathPrefix: `/${string}`, baseUrl: string | undefined, fallbackClient: HttpClient) {
  return {
    matches: (path: `/${string}`) => path.startsWith(pathPrefix),
    client: baseUrl ? createGatewayHttpClient(baseUrl) : fallbackClient
  }
}

function getRequiredApiBaseUrl(key: string): string {
  const baseUrl = process.env[key]

  if (!baseUrl || baseUrl === "УкажитеЗначение") {
    throw new Error(`Не задана обязательная переменная окружения ${key}`)
  }

  return baseUrl
}

function getOptionalApiBaseUrl(key: string): string | undefined {
  const value = process.env[key]
  if (!value || value === "УкажитеЗначение") return undefined

  return value
}
