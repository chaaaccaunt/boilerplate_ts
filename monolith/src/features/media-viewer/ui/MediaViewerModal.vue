<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue"
import { DownloadIcon, FileTextIcon, MaximizeIcon, PauseIcon, PlayIcon, Volume2Icon, VolumeXIcon, XIcon } from "@lucide/vue"
import type { MediaViewerFile } from "../model/types"

const props = defineProps<{
  modelValue: boolean
  file: MediaViewerFile | null
}>()

const emit = defineEmits<{
  (event: "update:modelValue", value: boolean): void
}>()

const playerElement = ref<HTMLDivElement | null>(null)
const videoElement = ref<HTMLVideoElement | null>(null)
const currentTime = ref(0)
const duration = ref(0)
const isPlaying = ref(false)
const isMuted = ref(false)
const isLoading = ref(false)
const hasVideoError = ref(false)
const isFullscreen = ref(false)
const volume = ref(1)

const isImage = computed(() => Boolean(props.file?.mimeType.startsWith("image/")))
const isVideo = computed(() => Boolean(props.file?.mimeType.startsWith("video/")))
const canSeek = computed(() => duration.value > 0 && !hasVideoError.value)
const currentTimeLabel = computed(() => formatVideoTime(currentTime.value))
const durationLabel = computed(() => formatVideoTime(duration.value))

function close(): void {
  emit("update:modelValue", false)
}

function formatVideoTime(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "0:00"

  const totalSeconds = Math.floor(value)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const paddedSeconds = seconds.toString().padStart(2, "0")

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${paddedSeconds}`
  }

  return `${minutes}:${paddedSeconds}`
}

function resetVideoState(): void {
  currentTime.value = 0
  duration.value = 0
  isPlaying.value = false
  isLoading.value = false
  hasVideoError.value = false
}

function updateVideoDuration(event: Event): void {
  const video = event.currentTarget as HTMLVideoElement
  duration.value = Number.isFinite(video.duration) ? video.duration : 0
}

function updateVideoTime(event: Event): void {
  const video = event.currentTarget as HTMLVideoElement
  currentTime.value = Number.isFinite(video.currentTime) ? video.currentTime : 0
}

function syncVideoVolume(video: HTMLVideoElement): void {
  video.volume = volume.value
  video.muted = isMuted.value
}

function handleVideoReady(event: Event): void {
  const video = event.currentTarget as HTMLVideoElement
  syncVideoVolume(video)
  updateVideoDuration(event)
  updateVideoTime(event)
  isLoading.value = false
  hasVideoError.value = false
}

function togglePlayback(): void {
  const video = videoElement.value
  if (!video || hasVideoError.value) return

  if (video.paused) {
    isLoading.value = true
    video.play()
      .then(() => {
        isPlaying.value = true
        isLoading.value = false
      })
      .catch(() => {
        isPlaying.value = false
        isLoading.value = false
      })
    return
  }

  video.pause()
}

function seekVideo(event: Event): void {
  const video = videoElement.value
  if (!video || !canSeek.value) return

  const input = event.currentTarget as HTMLInputElement
  const nextTime = Number(input.value)
  if (!Number.isFinite(nextTime)) return

  video.currentTime = nextTime
  currentTime.value = nextTime
}

function skipVideo(delta: number): void {
  const video = videoElement.value
  if (!video || !canSeek.value) return

  const nextTime = Math.min(Math.max(video.currentTime + delta, 0), duration.value)
  video.currentTime = nextTime
  currentTime.value = nextTime
}

function toggleMute(): void {
  const video = videoElement.value
  if (!video) return

  isMuted.value = !isMuted.value
  video.muted = isMuted.value
}

function changeVolume(event: Event): void {
  const video = videoElement.value
  const input = event.currentTarget as HTMLInputElement
  const nextVolume = Number(input.value)
  if (!video || !Number.isFinite(nextVolume)) return

  volume.value = nextVolume
  isMuted.value = nextVolume === 0
  syncVideoVolume(video)
}

function toggleFullscreen(): void {
  const player = playerElement.value
  if (!player) return

  if (document.fullscreenElement) {
    document.exitFullscreen()
      .catch(() => undefined)
    return
  }

  player.requestFullscreen()
    .catch(() => undefined)
}

function handleVideoError(): void {
  isLoading.value = false
  isPlaying.value = false
  hasVideoError.value = true
}

function handleFullscreenChange(): void {
  isFullscreen.value = document.fullscreenElement === playerElement.value
}

function handlePlayerKeydown(event: KeyboardEvent): void {
  if (event.key === " ") {
    event.preventDefault()
    togglePlayback()
    return
  }

  if (event.key === "ArrowLeft") {
    event.preventDefault()
    skipVideo(-5)
    return
  }

  if (event.key === "ArrowRight") {
    event.preventDefault()
    skipVideo(5)
  }
}

watch(
  () => [props.modelValue, props.file?.viewUrl] as const,
  () => resetVideoState()
)

onMounted(() => {
  document.addEventListener("fullscreenchange", handleFullscreenChange)
})

onBeforeUnmount(() => {
  document.removeEventListener("fullscreenchange", handleFullscreenChange)
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="modelValue"
      class="fixed inset-0 z-50 grid grid-rows-[auto_minmax(0,1fr)] bg-slate-950"
      role="dialog"
      aria-modal="true"
      aria-labelledby="media-viewer-modal-title"
    >
      <header class="flex min-w-0 items-center justify-between gap-3 border-b border-white/10 bg-slate-950 px-5 py-4">
        <h2 id="media-viewer-modal-title" class="min-w-0 truncate text-base font-semibold text-slate-50">
          {{ file?.originalName || "Просмотр файла" }}
        </h2>
        <div class="flex shrink-0 items-center gap-2">
          <a
            v-if="file"
            class="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-300 transition hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            :href="file.downloadUrl"
            :aria-label="`Скачать файл ${file.originalName}`"
          >
            <DownloadIcon class="h-5 w-5" aria-hidden="true" />
          </a>
          <button
            class="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-300 transition hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            type="button"
            aria-label="Закрыть окно"
            @click="close"
          >
            <XIcon class="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </header>

      <div class="flex min-h-0 items-center justify-center overflow-auto bg-slate-950 p-4">
        <img
          v-if="file && isImage"
          class="max-h-full max-w-full object-contain"
          :src="file.viewUrl"
          :alt="file.originalName"
        >
        <div
          v-else-if="file && isVideo"
          ref="playerElement"
          class="relative flex h-full w-full max-w-6xl flex-col items-center justify-center overflow-hidden bg-black outline-none"
          tabindex="0"
          @keydown="handlePlayerKeydown"
        >
          <video
            ref="videoElement"
            class="min-h-0 max-h-full max-w-full bg-black"
            :src="file.viewUrl"
            preload="metadata"
            playsinline
            @click="togglePlayback"
            @loadedmetadata="handleVideoReady"
            @durationchange="updateVideoDuration"
            @timeupdate="updateVideoTime"
            @waiting="isLoading = true"
            @canplay="isLoading = false"
            @play="isPlaying = true"
            @pause="isPlaying = false"
            @ended="isPlaying = false"
            @error="handleVideoError"
          ></video>

          <button
            v-if="!isPlaying && !hasVideoError"
            class="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-slate-950/70 text-white transition hover:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            type="button"
            aria-label="Воспроизвести видео"
            @click="togglePlayback"
          >
            <PlayIcon class="ml-1 h-8 w-8" aria-hidden="true" />
          </button>

          <div
            v-if="isLoading"
            class="absolute top-4 rounded-md bg-slate-950/75 px-3 py-1 text-sm text-slate-100"
          >
            Загрузка видео
          </div>

          <div
            v-if="hasVideoError"
            class="absolute inset-x-4 top-1/2 -translate-y-1/2 rounded-md bg-slate-950/85 px-4 py-3 text-center text-sm text-slate-100"
          >
            Не удалось воспроизвести видео
          </div>

          <div class="absolute inset-x-0 bottom-0 flex flex-col gap-3 bg-gradient-to-t from-black via-black/80 to-transparent px-4 pb-4 pt-10 text-slate-100">
            <input
              class="h-2 w-full cursor-pointer accent-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
              type="range"
              min="0"
              step="0.1"
              :max="duration"
              :value="currentTime"
              :disabled="!canSeek"
              aria-label="Перемотать видео"
              @input="seekVideo"
            >

            <div class="flex min-w-0 items-center gap-2 sm:gap-3">
              <button
                class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-slate-100 transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500"
                type="button"
                :aria-label="isPlaying ? 'Поставить видео на паузу' : 'Воспроизвести видео'"
                @click="togglePlayback"
              >
                <PauseIcon v-if="isPlaying" class="h-5 w-5" aria-hidden="true" />
                <PlayIcon v-else class="h-5 w-5" aria-hidden="true" />
              </button>

              <span class="w-24 shrink-0 text-sm tabular-nums text-slate-200 sm:w-28">
                {{ currentTimeLabel }} / {{ durationLabel }}
              </span>

              <button
                class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-slate-100 transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500"
                type="button"
                :aria-label="isMuted ? 'Включить звук' : 'Отключить звук'"
                @click="toggleMute"
              >
                <VolumeXIcon v-if="isMuted || volume === 0" class="h-5 w-5" aria-hidden="true" />
                <Volume2Icon v-else class="h-5 w-5" aria-hidden="true" />
              </button>

              <input
                class="hidden h-2 w-24 cursor-pointer accent-blue-500 sm:block"
                type="range"
                min="0"
                max="1"
                step="0.05"
                :value="volume"
                aria-label="Громкость видео"
                @input="changeVolume"
              >

              <div class="min-w-0 flex-1"></div>

              <button
                class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-slate-100 transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500"
                type="button"
                :aria-label="isFullscreen ? 'Выйти из полноэкранного режима' : 'Открыть видео на весь экран'"
                @click="toggleFullscreen"
              >
                <MaximizeIcon class="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
        <div v-else class="flex min-h-64 flex-col items-center justify-center gap-3 px-5 py-8 text-slate-300">
          <FileTextIcon class="h-10 w-10" aria-hidden="true" />
          <span class="text-sm">Просмотр файла недоступен</span>
        </div>
      </div>
    </div>
  </Teleport>
</template>
