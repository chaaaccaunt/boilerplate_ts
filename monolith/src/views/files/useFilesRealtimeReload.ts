import { onMounted, onUnmounted } from "vue"
import type { WebSocketClient } from "@/shared/realtime"

const events: iSharedFiles.FilesRealtimeEventName[] = [
  "files:file:created",
  "files:file:updated",
  "files:file:deleted",
  "files:folder:created",
  "files:folder:updated",
  "files:folder:deleted",
  "files:document:created",
  "files:document:updated",
  "files:document:deleted"
]

export function useFilesRealtimeReload(webSocketClient: WebSocketClient, reload: () => void, debounceMs = 150): void {
  const unsubscribeCallbacks: Array<() => void> = []
  let reloadTimer: number | null = null

  function scheduleReload(): void {
    if (reloadTimer !== null) window.clearTimeout(reloadTimer)
    reloadTimer = window.setTimeout(() => {
      reloadTimer = null
      reload()
    }, debounceMs)
  }

  onMounted(() => {
    events.forEach((eventName) => {
      unsubscribeCallbacks.push(webSocketClient.on<iSharedFiles.FilesRealtimeEventPayloadDto>(eventName, scheduleReload))
    })
  })

  onUnmounted(() => {
    unsubscribeCallbacks.splice(0).forEach((unsubscribe) => unsubscribe())
    if (reloadTimer !== null) window.clearTimeout(reloadTimer)
  })
}
