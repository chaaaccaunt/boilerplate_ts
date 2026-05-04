<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from "vue"
import { useApiClient, useStore, useWebSocketClient } from "@/entities"

const store = useStore()
const webSocketClient = useWebSocketClient()
const apiClient = useApiClient()

const messageText = ref("")
const errorMessage = ref<string | null>(null)
const selectedFiles = ref<iSharedFiles.UploadedFileDto[]>([])
const uploadFiles = ref<File[]>([])
const uploadDescription = ref("")
const uploadProgress = ref(0)
const isUploading = ref(false)
const isRoomModalOpen = ref(false)
const isUploadModalOpen = ref(false)
const roomForm = reactive<iSharedChat.ChatRoomCreatePayloadDto>({
  type: "group",
  title: "",
  memberUserUids: []
})
const membersInput = ref("")

const rooms = computed(() => store.state.chat.rooms)
const activeRoomUid = computed(() => store.state.chat.activeRoomUid)
const activeMessages = computed(() => activeRoomUid.value ? store.state.chat.messagesByRoomUid[activeRoomUid.value] || [] : [])

onMounted(() => {
  webSocketClient.on<iSharedChat.ChatMessageSendResponseDto>("chat:message:created", ({ message }) => {
    store.commit("chat/addMessage", message)
  })

  loadRooms()
})

onBeforeUnmount(() => {
  webSocketClient.off("chat:message:created")
})

function loadRooms(): void {
  errorMessage.value = null

  webSocketClient.emit<iSharedChat.ChatRoomsListResponseDto>("chat:rooms:list")
    .then((result) => {
      store.commit("chat/setRooms", result.rooms)

      if (store.state.chat.activeRoomUid) {
        return selectRoom(store.state.chat.activeRoomUid)
      }
    })
    .catch((error) => {
      errorMessage.value = getErrorMessage(error)
    })
}

function selectRoom(roomUid: string): Promise<void> {
  errorMessage.value = null
  store.commit("chat/setActiveRoomUid", roomUid)

  return webSocketClient.emit<{ joined: true }, iSharedChat.ChatMessagesListPayloadDto>("chat:room:join", { roomUid })
    .then(() => webSocketClient.emit<iSharedChat.ChatMessagesListResponseDto, iSharedChat.ChatMessagesListPayloadDto>("chat:messages:list", { roomUid }))
    .then((result) => {
      store.commit("chat/setMessages", { roomUid, messages: result.messages })
    })
    .catch((error) => {
      errorMessage.value = getErrorMessage(error)
    })
}

function createRoom(): void {
  errorMessage.value = null

  webSocketClient.emit<iSharedChat.ChatRoomCreateResponseDto, iSharedChat.ChatRoomCreatePayloadDto>("chat:room:create", {
    type: roomForm.type,
    title: roomForm.title,
    memberUserUids: membersInput.value.split(",").map((value) => value.trim()).filter(Boolean)
  })
    .then((result) => {
      store.commit("chat/addRoom", result.room)
      roomForm.title = ""
      membersInput.value = ""
      isRoomModalOpen.value = false
      return selectRoom(result.room.uid)
    })
    .catch((error) => {
      errorMessage.value = getErrorMessage(error)
    })
}

function sendMessage(): void {
  if (!activeRoomUid.value) return

  errorMessage.value = null

  webSocketClient.emit<iSharedChat.ChatMessageSendResponseDto, iSharedChat.ChatMessageSendPayloadDto>("chat:message:send", getMessagePayload(activeRoomUid.value))
    .then((result) => {
      store.commit("chat/addMessage", result.message)
      messageText.value = ""
      selectedFiles.value = []
    })
    .catch((error) => {
      errorMessage.value = getErrorMessage(error)
    })
}

function getMessagePayload(roomUid: string): iSharedChat.ChatMessageSendPayloadDto {
  const files = selectedFiles.value.map((file) => ({ fileUid: file.fileUid }))
  const payload: iSharedChat.ChatMessageSendPayloadDto = {
    roomUid,
    text: messageText.value
  }

  if (files.length) {
    payload.files = files
  }

  return payload
}

function openUploadModal(): void {
  uploadFiles.value = []
  uploadDescription.value = ""
  uploadProgress.value = 0
  isUploadModalOpen.value = true
}

function handleUploadFileSelect(event: Event): void {
  const input = event.target as HTMLInputElement
  uploadFiles.value = Array.from(input.files || [])
}

function uploadSelectedFiles(): void {
  if (!uploadFiles.value.length || isUploading.value) return

  errorMessage.value = null
  uploadProgress.value = 0
  isUploading.value = true

  apiClient.files.upload(uploadFiles.value, uploadDescription.value, (progress) => {
    uploadProgress.value = progress
  })
    .then((result) => {
      selectedFiles.value = selectedFiles.value.concat(result.files)
      uploadProgress.value = 100
      isUploadModalOpen.value = false
    })
    .catch((error) => {
      errorMessage.value = getErrorMessage(error)
    })
    .finally(() => {
      isUploading.value = false
    })
}

function removeSelectedFile(fileUid: string): void {
  selectedFiles.value = selectedFiles.value.filter((file) => file.fileUid !== fileUid)
}

function getFileUrl(url: string): string {
  return apiClient.resolvePublicUrl(url as `/${string}`)
}

function getRoomTypeLabel(type: iSharedChat.ChatRoomType): string {
  if (type === "public") return "Публичный"
  if (type === "group") return "Групповой"
  return "Приватный"
}

function getSenderName(sender: iSharedChat.ChatMessageSenderDto): string {
  return `${sender.lastName} ${sender.firstName}`
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return "Не удалось выполнить действие"
}
</script>

<template>
  <section class="chat-view">
    <aside class="chat-sidebar border-end">
      <div class="p-3 border-bottom">
        <button class="btn btn-primary w-100" type="button" @click="isRoomModalOpen = true">
          Создать чат
        </button>
      </div>

      <div class="list-group list-group-flush">
        <button
          v-for="room in rooms"
          :key="room.uid"
          class="list-group-item list-group-item-action"
          :class="{ active: room.uid === activeRoomUid }"
          type="button"
          @click="selectRoom(room.uid)"
        >
          <span class="d-block fw-semibold">{{ room.title }}</span>
          <small class="text-body-secondary">{{ getRoomTypeLabel(room.type) }}</small>
        </button>
      </div>
    </aside>

    <main class="chat-main">
      <div class="chat-messages p-3">
        <div v-if="!activeRoomUid" class="text-body-secondary">
          Выберите чат
        </div>

        <article
          v-for="message in activeMessages"
          :key="message.uid"
          class="chat-message border rounded p-2 mb-2 bg-white"
        >
          <div class="small text-body-secondary">
            {{ getSenderName(message.sender) }}
          </div>
          <p v-if="message.text" class="mb-2">{{ message.text }}</p>
          <div v-if="message.files.length" class="d-grid gap-1">
            <a
              v-for="file in message.files"
              :key="file.uid"
              class="d-inline-block"
              :href="getFileUrl(file.url)"
              :title="file.description || file.originalName"
            >
              {{ file.originalName }}
            </a>
          </div>
        </article>
      </div>

      <form class="chat-composer border-top p-3 bg-white" @submit.prevent="sendMessage">
        <div v-if="errorMessage" class="alert alert-danger py-2">
          {{ errorMessage }}
        </div>

        <div v-if="selectedFiles.length" class="selected-files mb-2">
          <div
            v-for="file in selectedFiles"
            :key="file.fileUid"
            class="selected-file border rounded px-2 py-1 bg-light"
          >
            <span class="text-truncate">{{ file.originalName }}</span>
            <button class="btn-close" type="button" aria-label="Убрать файл" @click="removeSelectedFile(file.fileUid)"></button>
          </div>
        </div>

        <textarea
          v-model.trim="messageText"
          class="form-control"
          rows="2"
          placeholder="Сообщение"
        ></textarea>

        <div class="d-flex justify-content-between gap-2 align-items-center mt-2">
          <button class="btn btn-outline-secondary" type="button" @click="openUploadModal">
            Прикрепить файлы
          </button>
          <button class="btn btn-primary" type="submit">Отправить</button>
        </div>
      </form>
    </main>

    <div v-if="isRoomModalOpen" class="modal-backdrop fade show"></div>
    <div v-if="isRoomModalOpen" class="modal d-block" tabindex="-1" role="dialog" aria-modal="true">
      <div class="modal-dialog">
        <form class="modal-content" @submit.prevent="createRoom">
          <div class="modal-header">
            <h2 class="modal-title h5">Создание чата</h2>
            <button class="btn-close" type="button" aria-label="Закрыть" @click="isRoomModalOpen = false"></button>
          </div>
          <div class="modal-body d-grid gap-3">
            <select v-model="roomForm.type" class="form-select" aria-label="Тип чата">
              <option value="group">Групповой</option>
              <option value="private">Приватный</option>
            </select>
            <input v-model.trim="roomForm.title" class="form-control" placeholder="Название чата">
            <input v-model.trim="membersInput" class="form-control" placeholder="Участники через запятую">
          </div>
          <div class="modal-footer">
            <button class="btn btn-outline-secondary" type="button" @click="isRoomModalOpen = false">Отмена</button>
            <button class="btn btn-primary" type="submit">Создать</button>
          </div>
        </form>
      </div>
    </div>

    <div v-if="isUploadModalOpen" class="modal-backdrop fade show"></div>
    <div v-if="isUploadModalOpen" class="modal d-block" tabindex="-1" role="dialog" aria-modal="true">
      <div class="modal-dialog">
        <form class="modal-content" @submit.prevent="uploadSelectedFiles">
          <div class="modal-header">
            <h2 class="modal-title h5">Загрузка файлов</h2>
            <button class="btn-close" type="button" aria-label="Закрыть" :disabled="isUploading" @click="isUploadModalOpen = false"></button>
          </div>
          <div class="modal-body d-grid gap-3">
            <input v-model.trim="uploadDescription" class="form-control" placeholder="Общее описание файлов">
            <input class="form-control" multiple type="file" @change="handleUploadFileSelect">

            <div v-if="uploadFiles.length" class="d-grid gap-1">
              <div v-for="file in uploadFiles" :key="file.name" class="small text-body-secondary text-truncate">
                {{ file.name }}
              </div>
            </div>

            <div v-if="isUploading || uploadProgress" class="progress" role="progressbar" aria-label="Прогресс загрузки" :aria-valuenow="uploadProgress" aria-valuemin="0" aria-valuemax="100">
              <div class="progress-bar" :style="{ width: `${uploadProgress}%` }">
                {{ uploadProgress }}%
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-outline-secondary" type="button" :disabled="isUploading" @click="isUploadModalOpen = false">Отмена</button>
            <button class="btn btn-primary" type="submit" :disabled="!uploadFiles.length || isUploading">Загрузить</button>
          </div>
        </form>
      </div>
    </div>
  </section>
</template>

<style lang="scss" scoped>
.chat-view {
  display: grid;
  grid-template-columns: minmax(260px, 320px) 1fr;
  min-height: calc(100vh - 57px);
}

.chat-sidebar {
  display: grid;
  grid-template-rows: auto 1fr;
  min-width: 0;
}

.chat-main {
  display: grid;
  grid-template-rows: minmax(0, 1fr) auto;
  min-width: 0;
}

.chat-messages {
  overflow: auto;
}

.chat-message {
  max-width: 720px;
}

.selected-files {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.selected-file {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  max-width: 280px;
}

@media (max-width: 768px) {
  .chat-view {
    grid-template-columns: 1fr;
  }
}
</style>
