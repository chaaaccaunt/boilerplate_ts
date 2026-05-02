import { inject, InjectionKey } from "vue"
import { Store } from "vuex"
import { HttpClient } from "@/shared/api"
import { ApiClient } from "./ApiClient"

export const apiClientKey: InjectionKey<ApiClient> = Symbol()

export function createApiClient(store: Store<iSharedState.RootState>): ApiClient {
  return new ApiClient(
    new HttpClient({
      baseUrl: `${getRequiredApiBaseUrl()}/v1/gateway`
    }),
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

function getRequiredApiBaseUrl(): string {
  const baseUrl = process.env.VUE_APP_BASE_URL

  if (!baseUrl) {
    throw new Error("Не задана обязательная переменная окружения VUE_APP_BASE_URL")
  }

  return baseUrl
}
