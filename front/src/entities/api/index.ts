import { inject, InjectionKey } from "vue"
import { Store } from "vuex"
import { HttpClient } from "@/shared/api"
import { ApiClient } from "./ApiClient"

export const apiClientKey: InjectionKey<ApiClient> = Symbol()

export function createApiClient(store: Store<iSharedState.RootState>): ApiClient {
  return new ApiClient(
    new HttpClient({
      baseUrl: `${process.env.VUE_APP_BASE_URL}/v1/gateway`
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
