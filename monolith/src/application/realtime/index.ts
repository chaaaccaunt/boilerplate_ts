import { inject, InjectionKey } from "vue"
import { WebSocketClient } from "@/shared/realtime"

export const webSocketClientKey: InjectionKey<WebSocketClient> = Symbol()

export function createWebSocketClient(): WebSocketClient {
  return new WebSocketClient(getRequiredWebSocketBaseUrl())
}

export function useWebSocketClient(): WebSocketClient {
  const webSocketClient = inject(webSocketClientKey)

  if (!webSocketClient) {
    throw new Error("WebSocketClient не был передан в приложение")
  }

  return webSocketClient
}

function getRequiredWebSocketBaseUrl(): string {
  const baseUrl = process.env.VUE_APP_WEBSOCKET_BASE_URL || process.env.VUE_APP_BASE_URL

  if (!baseUrl || baseUrl === "УкажитеЗначение") {
    throw new Error("Не задана обязательная переменная окружения VUE_APP_BASE_URL")
  }

  return baseUrl
}
