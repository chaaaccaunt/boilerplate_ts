<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue"
import { useApiClient } from "@/application/api"
import { useWebSocketClient } from "@/application/realtime"
import { useStore } from "@/application/store"
import { ApiError } from "@/shared/api"
import ChatMessageComposer from "./components/ChatMessageComposer.vue"
import ChatMessagesList from "./components/ChatMessagesList.vue"
import ChatRoomsPanel from "./components/ChatRoomsPanel.vue"

const apiClient = useApiClient()
const store = useStore()
const webSocketClient = useWebSocketClient()

const isLoading = ref(false)
const isSending = ref(false)
const errorMessage = ref("")
const lastActiveRoomStorageKeyPrefix = "chat:last-active-room-uid"

const rooms = computed(() => store.state.chat.rooms)
const activeRoomUid = computed(() => store.state.chat.activeRoomUid)
const activeRoom = computed(() => rooms.value.find((room) => room.uid === activeRoomUid.value) || null)
const messages = computed(() => activeRoomUid.value ? store.state.chat.messagesByRoomUid[activeRoomUid.value] || [] : [])

onMounted(() => {
  webSocketClient.on<iSharedChat.ChatMessageSendResponseDto>("chat:message:created", ({ message }) => {
    store.commit("chat/addMessage", message)
  })

  loadRooms()
})

onBeforeUnmount(() => {
  webSocketClient.off("chat:message:created")
})

watch(activeRoomUid, (roomUid) => {
  if (roomUid) loadMessages(roomUid)
})

function loadRooms(): void {
  isLoading.value = true
  errorMessage.value = ""

  webSocketClient.emit<iSharedChat.ChatRoomsListResponseDto>("chat:rooms:list")
    .then((result) => {
      store.commit("chat/setRooms", result.rooms)
      const activeRoomUid = resolveInitialActiveRoomUid(result.rooms)
      store.commit("chat/setActiveRoomUid", activeRoomUid)
      saveLastActiveRoomUid(activeRoomUid)
    })
    .catch((error) => {
      errorMessage.value = getErrorMessage(error, "Не удалось загрузить комнаты")
    })
    .finally(() => {
      isLoading.value = false
    })
}

function loadMessages(roomUid: string): void {
  apiClient.chat.listMessages(roomUid)
    .catch((error) => {
      errorMessage.value = error instanceof ApiError ? error.message : "Не удалось загрузить сообщения"
    })
}

function selectRoom(roomUid: string): void {
  webSocketClient.emit<{ joined: true }, iSharedChat.ChatMessagesListPayloadDto>("chat:room:join", { roomUid })
    .then(() => {
      store.commit("chat/setActiveRoomUid", roomUid)
      saveLastActiveRoomUid(roomUid)
    })
    .catch((error) => {
      errorMessage.value = error instanceof ApiError ? error.message : "Не удалось открыть комнату"
    })
}

function createRoom(title: string): void {
  webSocketClient.emit<iSharedChat.ChatRoomCreateResponseDto, iSharedChat.ChatRoomCreatePayloadDto>("chat:room:create", {
    type: "group",
    title,
    memberUserUids: []
  })
    .then(({ room }) => {
      store.commit("chat/addRoom", room)
      store.commit("chat/setActiveRoomUid", room.uid)
      saveLastActiveRoomUid(room.uid)
    })
    .catch((error) => {
      errorMessage.value = error instanceof ApiError ? error.message : "Не удалось создать комнату"
    })
}

function sendMessage(payload: { text: string, files: File[] }): void {
  if (!activeRoomUid.value) return

  isSending.value = true
  errorMessage.value = ""

  uploadMessageFiles(payload.files)
    .then((files) => webSocketClient.emit<iSharedChat.ChatMessageSendResponseDto, iSharedChat.ChatMessageSendPayloadDto>("chat:message:send", {
      roomUid: activeRoomUid.value as string,
      text: payload.text || undefined,
      files: files.map((file) => ({ fileUid: file.fileUid }))
    }))
    .then(({ message }) => {
      store.commit("chat/addMessage", message)
    })
    .catch((error) => {
      errorMessage.value = error instanceof ApiError ? error.message : "Не удалось отправить сообщение"
    })
    .finally(() => {
      isSending.value = false
    })
}

function uploadMessageFiles(files: File[]): Promise<iSharedFiles.UploadedFileDto[]> {
  if (!files.length) return Promise.resolve([])

  return apiClient.files.upload(files, "")
    .then((result) => result.files)
}

function resolveFileUrl(path: string): string {
  return apiClient.resolvePublicUrl(path as `/${string}`)
}

function resolveInitialActiveRoomUid(rooms: iSharedChat.ChatRoomDto[]): string {
  const lastActiveRoomUid = readLastActiveRoomUid()

  if (lastActiveRoomUid && rooms.some((room) => room.uid === lastActiveRoomUid)) {
    return lastActiveRoomUid
  }

  const publicRoom = rooms.find((room) => room.type === "public")

  if (!publicRoom) {
    throw new Error("Не найден общий чат")
  }

  return publicRoom.uid
}

function readLastActiveRoomUid(): string | null {
  return localStorage.getItem(getLastActiveRoomStorageKey())
}

function saveLastActiveRoomUid(roomUid: string): void {
  localStorage.setItem(getLastActiveRoomStorageKey(), roomUid)
}

function getLastActiveRoomStorageKey(): string {
  const userUid = store.state.authorization.user?.uid

  if (!userUid) {
    throw new Error("Не удалось определить пользователя для восстановления чата")
  }

  return `${lastActiveRoomStorageKeyPrefix}:${userUid}`
}

function getErrorMessage(error: unknown, defaultMessage: string): string {
  if (error instanceof ApiError || error instanceof Error) return error.message
  return defaultMessage
}
</script>

<template>
  <section class="grid min-h-[calc(100vh-57px)] md:grid-cols-[300px_minmax(0,1fr)]">
    <ChatRoomsPanel
      :rooms="rooms"
      :active-room-uid="activeRoomUid"
      :is-loading="isLoading"
      @refresh="loadRooms"
      @select="selectRoom"
      @create="createRoom"
    />

    <div class="grid min-w-0 grid-rows-[57px_minmax(0,1fr)_auto]">
      <header class="flex min-w-0 items-center border-b border-slate-200 bg-white px-4">
        <div class="min-w-0 truncate text-sm font-semibold text-slate-700">{{ activeRoom?.title || "Комната не выбрана" }}</div>
      </header>

      <ChatMessagesList
        :messages="messages"
        :active-room-uid="activeRoomUid"
        :error-message="errorMessage"
        :resolve-file-url="resolveFileUrl"
      />

      <ChatMessageComposer
        :active-room-uid="activeRoomUid"
        :is-sending="isSending"
        @send="sendMessage"
      />
    </div>
  </section>
</template>
