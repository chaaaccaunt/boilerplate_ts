<script lang="ts" setup>
import { nextTick, ref, watch } from "vue"
import { ArrowDownIcon, DownloadIcon, EyeIcon, FileTextIcon, PencilIcon, SaveIcon, Trash2Icon, XIcon } from "@lucide/vue"
import { useApiClient } from "@/application/api"
import { MediaViewerModal } from "@/features/media-viewer"
import type { MediaViewerFile } from "@/features/media-viewer"

const props = defineProps<{
  messages: iSharedChat.ChatMessageDto[]
  activeRoomUid: string | null
  errorMessage: string
  resolveFileUrl: (path: string) => string
}>()

const emit = defineEmits<{
  (event: "update-message", payload: iSharedChat.ChatMessageUpdatePayloadDto): void
  (event: "delete-message", payload: iSharedChat.ChatMessageDeletePayloadDto): void
  (event: "delete-message-file", payload: iSharedChat.ChatMessageFileDeletePayloadDto): void
}>()

const apiClient = useApiClient()
const messagesContainer = ref<HTMLElement | null>(null)
const viewedFile = ref<MediaViewerFile | null>(null)
const editedMessageUid = ref<string | null>(null)
const editedText = ref("")
const linkedFiles = ref<Record<string, iSharedFiles.UploadedFileDto>>({})
const loadingLinkedFileUids = new Set<string>()
const isAutoScrollLocked = ref(false)
const autoScrollBottomThreshold = 96

type MessageTextSegment =
  | { kind: "text", value: string }
  | { kind: "file-link", value: string, fileName: string, href: string }

watch(
  () => props.messages,
  (messages) => {
    loadLinkedFileMetadata(messages)
  },
  { immediate: true, deep: true }
)

watch(
  () => props.activeRoomUid,
  () => {
    isAutoScrollLocked.value = false
    scrollToLastMessage()
  }
)

watch(
  () => props.messages.length,
  () => {
    if (!isAutoScrollLocked.value) scrollToLastMessage()
  }
)

function toggleAutoScrollLock(): void {
  isAutoScrollLocked.value = false
  scrollToLastMessage()
}

function scrollToLastMessage(): void {
  nextTick(() => {
    const container = messagesContainer.value
    if (!container) return

    container.scrollTo({
      top: container.scrollHeight,
      behavior: "smooth"
    })
  })
}

function updateAutoScrollLock(): void {
  const container = messagesContainer.value
  if (!container) return

  const distanceToBottom = container.scrollHeight - container.scrollTop - container.clientHeight
  isAutoScrollLocked.value = distanceToBottom > autoScrollBottomThreshold
}

function openFile(file: iSharedChat.ChatFileDto): void {
  if (!file.viewUrl) return

  viewedFile.value = {
    originalName: file.originalName,
    mimeType: file.mimeType,
    viewUrl: props.resolveFileUrl(file.viewUrl),
    downloadUrl: props.resolveFileUrl(file.url)
  }
}

function startEdit(message: iSharedChat.ChatMessageDto): void {
  editedMessageUid.value = message.uid
  editedText.value = message.text || ""
}

function cancelEdit(): void {
  editedMessageUid.value = null
  editedText.value = ""
}

function saveMessage(message: iSharedChat.ChatMessageDto): void {
  const text = editedText.value.trim()

  emit("update-message", {
    messageUid: message.uid,
    text: text || undefined,
    files: message.files.map((file) => ({ fileUid: file.fileUid }))
  })
  cancelEdit()
}

function deleteMessage(message: iSharedChat.ChatMessageDto): void {
  emit("delete-message", { messageUid: message.uid })
}

function deleteMessageFile(message: iSharedChat.ChatMessageDto, file: iSharedChat.ChatFileDto): void {
  emit("delete-message-file", {
    messageUid: message.uid,
    fileUid: file.fileUid
  })
}

function parseMessageText(message: iSharedChat.ChatMessageDto): MessageTextSegment[] {
  if (!message.text) return []

  const segments: MessageTextSegment[] = []
  const filesByUid = new Map(message.files.map((file) => [file.fileUid, file]))
  const urlExpression = /(https?:\/\/[^\s]+|\/v1\/gateway\/files\/[^\s]+)/g
  let lastIndex = 0
  let match = urlExpression.exec(message.text)

  while (match) {
    const matchedUrl = match[0]
    const fileUid = extractFileUid(matchedUrl)
    const attachedFile = fileUid ? filesByUid.get(fileUid) : null
    const linkedFile = fileUid ? linkedFiles.value[fileUid] : null

    if (match.index > lastIndex) {
      segments.push({
        kind: "text",
        value: message.text.slice(lastIndex, match.index)
      })
    }

    if (attachedFile) {
      segments.push({
        kind: "file-link",
        value: matchedUrl,
        fileName: attachedFile.originalName,
        href: props.resolveFileUrl(attachedFile.url)
      })
    } else if (linkedFile) {
      segments.push({
        kind: "file-link",
        value: matchedUrl,
        fileName: linkedFile.originalName,
        href: props.resolveFileUrl(linkedFile.url)
      })
    } else {
      segments.push({
        kind: "text",
        value: matchedUrl
      })
    }

    lastIndex = match.index + matchedUrl.length
    match = urlExpression.exec(message.text)
  }

  if (lastIndex < message.text.length) {
    segments.push({
      kind: "text",
      value: message.text.slice(lastIndex)
    })
  }

  return segments
}

function loadLinkedFileMetadata(messages: iSharedChat.ChatMessageDto[]): void {
  collectTextFileUids(messages).forEach((fileUid) => {
    if (linkedFiles.value[fileUid] || loadingLinkedFileUids.has(fileUid)) return

    loadingLinkedFileUids.add(fileUid)
    apiClient.files.getMetadata(fileUid)
      .then((file) => {
        linkedFiles.value = {
          ...linkedFiles.value,
          [file.fileUid]: file
        }
      })
      .catch(() => undefined)
      .finally(() => {
        loadingLinkedFileUids.delete(fileUid)
      })
  })
}

function collectTextFileUids(messages: iSharedChat.ChatMessageDto[]): string[] {
  const fileUids = new Set<string>()

  messages.forEach((message) => {
    if (!message.text) return

    Array.from(message.text.matchAll(/(?:https?:\/\/[^\s]+|\/v1\/gateway\/files\/[^\s]+)/g))
      .forEach((match) => {
        const fileUid = extractFileUid(match[0])
        if (fileUid) fileUids.add(fileUid)
      })
  })

  return Array.from(fileUids)
}

function extractFileUid(url: string): string | null {
  const match = url.match(/[?&]fileUid=([0-9a-fA-F-]{36})/)

  return match ? match[1] : null
}
</script>

<template>
  <div ref="messagesContainer" class="relative min-h-0 min-w-0 overflow-auto p-4" @scroll="updateAutoScrollLock">
    <div v-if="errorMessage" class="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
      {{ errorMessage }}
    </div>

    <div
      v-for="message in messages"
      :key="message.uid"
      class="mb-3 flex"
      :class="message.isOwn ? 'justify-end' : 'justify-start'"
    >
      <div
        class="max-w-[min(760px,88%)] rounded-lg border p-4 shadow-sm"
        :class="message.isOwn ? 'border-blue-500 bg-blue-600 text-white dark:border-blue-500 dark:bg-blue-600' : 'border-slate-200 bg-white text-slate-950 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50'"
      >
        <div
          class="mb-1 text-xs font-medium"
          :class="message.isOwn ? 'text-blue-100' : 'text-slate-500 dark:text-slate-400'"
        >
          {{ message.sender.lastName }} {{ message.sender.firstName }}
        </div>
        <div v-if="message.isOwn" class="mb-2 flex justify-end gap-1">
          <button
            v-if="editedMessageUid !== message.uid"
            class="inline-flex h-8 w-8 items-center justify-center rounded-md transition"
            :class="message.isOwn ? 'text-white hover:bg-blue-400/50' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'"
            type="button"
            :aria-label="`Редактировать сообщение ${message.uid}`"
            @click="startEdit(message)"
          >
            <PencilIcon class="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            v-if="editedMessageUid === message.uid"
            class="inline-flex h-8 w-8 items-center justify-center rounded-md text-white transition hover:bg-blue-400/50"
            type="button"
            :aria-label="`Сохранить сообщение ${message.uid}`"
            @click="saveMessage(message)"
          >
            <SaveIcon class="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            v-if="editedMessageUid === message.uid"
            class="inline-flex h-8 w-8 items-center justify-center rounded-md text-white transition hover:bg-blue-400/50"
            type="button"
            :aria-label="`Отменить редактирование сообщения ${message.uid}`"
            @click="cancelEdit"
          >
            <XIcon class="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            class="inline-flex h-8 w-8 items-center justify-center rounded-md text-white transition hover:bg-blue-400/50"
            type="button"
            :aria-label="`Удалить сообщение ${message.uid}`"
            @click="deleteMessage(message)"
          >
            <Trash2Icon class="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <textarea
          v-if="editedMessageUid === message.uid"
          v-model="editedText"
          class="min-h-24 w-full rounded-md border border-blue-300 px-3 py-2 text-sm text-slate-950 outline-none transition focus:ring-2 focus:ring-blue-100"
        ></textarea>
        <div v-else-if="message.text" class="whitespace-pre-wrap break-words text-sm">
          <template
            v-for="(segment, segmentIndex) in parseMessageText(message)"
            :key="`${message.uid}:${segmentIndex}`"
          >
            <span v-if="segment.kind === 'text'">{{ segment.value }}</span>
            <a
              v-else
              class="font-medium underline decoration-current/50 underline-offset-2 transition hover:decoration-current"
              :class="message.isOwn ? 'text-white' : 'text-blue-700 dark:text-blue-300'"
              :href="segment.href"
              :aria-label="`Скачать файл ${segment.fileName}`"
            >{{ segment.fileName }}</a>
          </template>
        </div>
        <div v-if="message.files.length" class="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          <div
            v-for="file in message.files"
            :key="file.uid"
            class="flex min-h-14 min-w-0 items-center gap-3 rounded-md border px-3 py-2 text-sm font-medium transition"
            :class="message.isOwn ? 'border-blue-400 bg-blue-500/40 text-white hover:bg-blue-500/60' : 'border-slate-200 text-blue-700 hover:bg-blue-50 dark:border-slate-700 dark:text-blue-300 dark:hover:bg-blue-950/40'"
          >
            <button
              class="flex min-w-0 flex-1 items-center gap-3 text-left"
              type="button"
              :disabled="!file.viewUrl"
              :aria-label="file.viewUrl ? `Открыть файл ${file.originalName}` : undefined"
              @click="openFile(file)"
            >
              <img
                v-if="file.previewUrl"
                class="h-11 w-11 shrink-0 rounded object-cover"
                :src="resolveFileUrl(file.previewUrl)"
                :alt="`Превью файла ${file.originalName}`"
              >
              <span v-else class="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                <FileTextIcon class="h-5 w-5" aria-hidden="true" />
              </span>
              <span class="min-w-0 truncate">{{ file.originalName }}</span>
            </button>
            <button
              v-if="file.viewUrl"
              class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md transition hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:hover:bg-blue-950"
              :class="message.isOwn ? 'text-white hover:bg-blue-400/50' : 'text-blue-700 dark:text-blue-300'"
              type="button"
              :aria-label="`Просмотреть файл ${file.originalName}`"
              @click="openFile(file)"
            >
              <EyeIcon class="h-4 w-4" aria-hidden="true" />
            </button>
            <a
              class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md transition hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:hover:bg-blue-950"
              :class="message.isOwn ? 'text-white hover:bg-blue-400/50' : 'text-blue-700 dark:text-blue-300'"
              :href="resolveFileUrl(file.url)"
              :aria-label="`Скачать файл ${file.originalName}`"
            >
              <DownloadIcon class="h-4 w-4" aria-hidden="true" />
            </a>
            <button
              v-if="message.isOwn"
              class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md transition hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500"
              :class="message.isOwn ? 'text-white hover:bg-blue-400/50' : 'text-red-600 dark:hover:bg-red-950/40'"
              type="button"
              :aria-label="`Удалить вложение ${file.originalName}`"
              @click="deleteMessageFile(message, file)"
            >
              <Trash2Icon class="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="activeRoomUid && !messages.length" class="text-sm text-slate-500 dark:text-slate-400">
      Сообщений пока нет
    </div>

    <button
      v-if="isAutoScrollLocked"
      class="sticky bottom-0 z-10 ml-auto flex h-10 items-center gap-2 rounded-md bg-blue-600 px-3 text-sm font-medium text-white shadow-lg transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
      type="button"
      aria-label="Перейти к последнему сообщению"
      @click="toggleAutoScrollLock"
    >
      <ArrowDownIcon class="h-4 w-4" aria-hidden="true" />
      <span>К последнему</span>
    </button>

    <MediaViewerModal
      :model-value="Boolean(viewedFile)"
      :file="viewedFile"
      @update:model-value="viewedFile = $event ? viewedFile : null"
    />
  </div>
</template>
