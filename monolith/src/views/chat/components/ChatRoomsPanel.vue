<script lang="ts" setup>
import { ref } from "vue"
import { LogOutIcon, PencilIcon, PlusIcon, RefreshCwIcon, Trash2Icon, XIcon } from "@lucide/vue"
import ModalHost from "@/application/providers/ModalHost.vue"

const props = defineProps<{
  rooms: iSharedChat.ChatRoomDto[]
  availableMembers: iSharedUser.PublicUserDto[]
  activeRoomUid: string | null
  isLoading: boolean
  currentUserUid: string | null
}>()

const emit = defineEmits<{
  (event: "refresh"): void
  (event: "select", roomUid: string): void
  (event: "create", memberUserUids: string[]): void
  (event: "update", payload: iSharedChat.ChatRoomUpdatePayloadDto): void
  (event: "delete", payload: iSharedChat.ChatRoomDeletePayloadDto): void
  (event: "leave", payload: iSharedChat.ChatRoomLeavePayloadDto): void
}>()

const newRoomMemberUserUids = ref<string[]>([])
const editingRoom = ref<iSharedChat.ChatRoomDto | null>(null)
const deletingRoom = ref<iSharedChat.ChatRoomDto | null>(null)
const leavingRoom = ref<iSharedChat.ChatRoomDto | null>(null)
const editedRoomTitle = ref("")
const editedRoomMemberUserUids = ref<string[]>([])
const isCreateModalOpen = ref(false)

function createRoom(): void {
  if (!newRoomMemberUserUids.value.length) return

  emit("create", newRoomMemberUserUids.value)
  newRoomMemberUserUids.value = []
  isCreateModalOpen.value = false
}

function openEditRoom(room: iSharedChat.ChatRoomDto): void {
  editingRoom.value = room
  editedRoomTitle.value = room.title
  editedRoomMemberUserUids.value = room.memberUserUids.filter((userUid) => userUid !== props.currentUserUid)
}

function updateRoom(): void {
  if (!editingRoom.value) return

  const title = editedRoomTitle.value.trim()
  if (!title) return

  emit("update", {
    roomUid: editingRoom.value.uid,
    title,
    memberUserUids: editedRoomMemberUserUids.value
  })
  editingRoom.value = null
  editedRoomTitle.value = ""
  editedRoomMemberUserUids.value = []
}

function deleteRoom(): void {
  if (!deletingRoom.value) return

  emit("delete", { roomUid: deletingRoom.value.uid })
  deletingRoom.value = null
}

function leaveRoom(): void {
  if (!leavingRoom.value) return

  emit("leave", { roomUid: leavingRoom.value.uid })
  leavingRoom.value = null
}

function canManageRoom(room: iSharedChat.ChatRoomDto): boolean {
  return Boolean(props.currentUserUid && room.type === "group" && room.createdByUserUid === props.currentUserUid)
}

function canLeaveRoom(room: iSharedChat.ChatRoomDto): boolean {
  if (room.type === "public") return false
  if (room.type === "group" && room.createdByUserUid === props.currentUserUid) return false

  return true
}
</script>

<template>
  <aside class="min-w-0 border-b border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 md:border-b-0 md:border-r">
    <div class="border-b border-slate-200 p-4 dark:border-slate-700">
      <div class="mb-4 flex items-center justify-between gap-2">
        <h1 class="text-lg font-semibold text-slate-950 dark:text-slate-50">Чат</h1>
        <div class="flex items-center gap-2">
          <button
            class="inline-flex min-h-9 items-center gap-2 rounded-md border border-blue-200 px-3 text-sm font-medium text-blue-700 transition hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-blue-900 dark:text-blue-300 dark:hover:bg-blue-950/40"
            type="button"
            :disabled="isLoading"
            @click="emit('refresh')"
          >
            <RefreshCwIcon class="h-4 w-4" aria-hidden="true" />
            Обновить
          </button>
          <button
            class="inline-flex h-9 w-9 items-center justify-center rounded-md bg-blue-600 text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            type="button"
            aria-label="Создать комнату"
            @click="isCreateModalOpen = true"
          >
            <PlusIcon class="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>

    <div class="divide-y divide-slate-100 dark:divide-slate-800">
      <div
        v-for="room in rooms"
        :key="room.uid"
        class="flex min-h-11 w-full min-w-0 items-center gap-2 px-4 text-left text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-50"
        :class="room.uid === activeRoomUid ? 'bg-blue-600 text-white hover:bg-blue-600 hover:text-white' : ''"
      >
        <button
          class="min-h-11 min-w-0 flex-1 text-left"
          type="button"
          @click="emit('select', room.uid)"
        >
          <span class="block truncate">{{ room.title }}</span>
        </button>
        <div class="flex shrink-0 items-center gap-1">
          <button
            v-if="canManageRoom(room)"
            class="inline-flex h-8 w-8 items-center justify-center rounded-md transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500"
            type="button"
            :aria-label="`Редактировать комнату ${room.title}`"
            @click="openEditRoom(room)"
          >
            <PencilIcon class="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            v-if="canManageRoom(room)"
            class="inline-flex h-8 w-8 items-center justify-center rounded-md transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500"
            type="button"
            :aria-label="`Удалить комнату ${room.title}`"
            @click="deletingRoom = room"
          >
            <Trash2Icon class="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            v-if="canLeaveRoom(room)"
            class="inline-flex h-8 w-8 items-center justify-center rounded-md transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500"
            type="button"
            :aria-label="`Покинуть комнату ${room.title}`"
            @click="leavingRoom = room"
          >
            <LogOutIcon class="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div v-if="!rooms.length" class="p-4 text-sm text-slate-500 dark:text-slate-400">
        Комнаты не загружены
      </div>
    </div>

    <ModalHost v-model="isCreateModalOpen" labelled-by="chat-room-create-modal-title">
      <template #default="{ close }">
        <header class="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-700">
          <h2 id="chat-room-create-modal-title" class="min-w-0 truncate text-base font-semibold text-slate-950 dark:text-slate-50">
            Новый чат
          </h2>
          <button
            class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-50"
            type="button"
            aria-label="Закрыть окно"
            @click="close"
          >
            <XIcon class="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        <form class="px-5 py-4" @submit.prevent="createRoom">
          <div class="mb-5">
            <div class="mb-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">Участники</div>
            <div class="max-h-64 overflow-auto rounded-md border border-slate-200 dark:border-slate-700">
              <label
                v-for="user in availableMembers.filter((item) => item.uid !== currentUserUid)"
                :key="user.uid"
                class="flex min-h-10 items-center gap-2 border-b border-slate-100 px-3 text-sm last:border-b-0 dark:border-slate-800"
              >
                <input
                  v-model="newRoomMemberUserUids"
                  class="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  type="checkbox"
                  :value="user.uid"
                >
                <span class="min-w-0 truncate text-slate-700 dark:text-slate-200">{{ user.fullName }}</span>
              </label>
              <div v-if="availableMembers.length <= 1" class="px-3 py-2 text-sm text-slate-500 dark:text-slate-400">
                Нет доступных пользователей
              </div>
            </div>
          </div>

          <button
            class="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-md bg-blue-600 px-4 text-sm font-medium text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            type="submit"
            :disabled="!newRoomMemberUserUids.length"
          >
            <PlusIcon class="h-4 w-4" aria-hidden="true" />
            Создать
          </button>
        </form>
      </template>
    </ModalHost>

    <ModalHost :model-value="Boolean(editingRoom)" labelled-by="chat-room-edit-modal-title" @update:model-value="editingRoom = $event ? editingRoom : null">
      <template #default="{ close }">
        <header class="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-700">
          <h2 id="chat-room-edit-modal-title" class="min-w-0 truncate text-base font-semibold text-slate-950 dark:text-slate-50">
            Редактирование комнаты
          </h2>
          <button
            class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-50"
            type="button"
            aria-label="Закрыть окно"
            @click="close"
          >
            <XIcon class="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        <form class="px-5 py-4" @submit.prevent="updateRoom">
          <div class="mb-5">
            <label class="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200" for="chat-room-edit-title">Название комнаты</label>
            <input
              id="chat-room-edit-title"
              v-model="editedRoomTitle"
              class="h-10 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50 dark:focus:ring-blue-950"
              type="text"
              required
            >
          </div>

          <div class="mb-5">
            <div class="mb-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">Участники</div>
            <div class="max-h-56 overflow-auto rounded-md border border-slate-200 dark:border-slate-700">
              <label
                v-for="user in availableMembers.filter((item) => item.uid !== currentUserUid)"
                :key="user.uid"
                class="flex min-h-10 items-center gap-2 border-b border-slate-100 px-3 text-sm last:border-b-0 dark:border-slate-800"
              >
                <input
                  v-model="editedRoomMemberUserUids"
                  class="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  type="checkbox"
                  :value="user.uid"
                >
                <span class="min-w-0 truncate text-slate-700 dark:text-slate-200">{{ user.fullName }}</span>
              </label>
              <div v-if="availableMembers.length <= 1" class="px-3 py-2 text-sm text-slate-500 dark:text-slate-400">
                Нет доступных пользователей
              </div>
            </div>
          </div>

          <button
            class="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-md bg-blue-600 px-4 text-sm font-medium text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            type="submit"
            :disabled="!editedRoomTitle.trim()"
          >
            <PencilIcon class="h-4 w-4" aria-hidden="true" />
            Сохранить
          </button>
        </form>
      </template>
    </ModalHost>

    <ModalHost :model-value="Boolean(deletingRoom)" labelled-by="chat-room-delete-modal-title" @update:model-value="deletingRoom = $event ? deletingRoom : null">
      <template #default="{ close }">
        <header class="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-700">
          <h2 id="chat-room-delete-modal-title" class="min-w-0 truncate text-base font-semibold text-slate-950 dark:text-slate-50">
            Удаление комнаты
          </h2>
          <button
            class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-50"
            type="button"
            aria-label="Закрыть окно"
            @click="close"
          >
            <XIcon class="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        <div class="px-5 py-4">
          <p class="mb-5 text-sm text-slate-600 dark:text-slate-300">
            Комната будет закрыта для участников и останется доступна в архиве чатов.
          </p>
          <button
            class="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-md bg-red-600 px-4 text-sm font-medium text-white transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            type="button"
            @click="deleteRoom"
          >
            <Trash2Icon class="h-4 w-4" aria-hidden="true" />
            Удалить
          </button>
        </div>
      </template>
    </ModalHost>

    <ModalHost :model-value="Boolean(leavingRoom)" labelled-by="chat-room-leave-modal-title" @update:model-value="leavingRoom = $event ? leavingRoom : null">
      <template #default="{ close }">
        <header class="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-700">
          <h2 id="chat-room-leave-modal-title" class="min-w-0 truncate text-base font-semibold text-slate-950 dark:text-slate-50">
            Выход из комнаты
          </h2>
          <button
            class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-50"
            type="button"
            aria-label="Закрыть окно"
            @click="close"
          >
            <XIcon class="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        <div class="px-5 py-4">
          <p class="mb-5 text-sm text-slate-600 dark:text-slate-300">
            Комната исчезнет из вашего списка. Для остальных активных участников она останется доступной.
          </p>
          <button
            class="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-md bg-blue-600 px-4 text-sm font-medium text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            type="button"
            @click="leaveRoom"
          >
            <LogOutIcon class="h-4 w-4" aria-hidden="true" />
            Покинуть
          </button>
        </div>
      </template>
    </ModalHost>
  </aside>
</template>
