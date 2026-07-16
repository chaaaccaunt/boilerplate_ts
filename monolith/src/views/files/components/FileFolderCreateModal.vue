<script lang="ts" setup>
import { ref, watch } from "vue"
import { FolderPlusIcon, XIcon } from "@lucide/vue"
import ModalHost from "@/application/providers/ModalHost.vue"

const props = defineProps<{
  modelValue: boolean
  currentFolder: iSharedFiles.FileFolderDto | null
  isSubmitting: boolean
  errorMessage: string
}>()

const emit = defineEmits<{
  (event: "update:modelValue", value: boolean): void
  (event: "submit", payload: { title: string, visibility: iSharedFiles.FileVisibility }): void
}>()

const title = ref("")
const isPrivate = ref(false)

watch(
  () => props.modelValue,
  (isOpen) => {
    if (!isOpen) return

    title.value = ""
    isPrivate.value = false
  }
)

function close(): void {
  if (props.isSubmitting) return
  emit("update:modelValue", false)
}

function submit(): void {
  emit("submit", {
    title: title.value,
    visibility: isPrivate.value ? "private" : "public"
  })
}
</script>

<template>
  <ModalHost
    :model-value="modelValue"
    labelled-by="file-folder-create-title"
    :close-on-backdrop="!isSubmitting"
    :close-on-escape="!isSubmitting"
    @update:model-value="$event ? emit('update:modelValue', true) : close()"
  >
    <template #default>
      <form @submit.prevent="submit">
        <header class="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-700">
          <div class="min-w-0">
            <h2 id="file-folder-create-title" class="truncate text-base font-semibold text-slate-950 dark:text-slate-50">
              Новая папка
            </h2>
            <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {{ currentFolder?.title || "Корень" }}
            </p>
          </div>
          <button
            class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-50"
            type="button"
            :disabled="isSubmitting"
            aria-label="Закрыть окно"
            @click="close"
          >
            <XIcon class="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        <div class="grid gap-4 px-5 py-4">
          <div v-if="errorMessage" class="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200" role="alert">
            {{ errorMessage }}
          </div>

          <label class="grid gap-2" for="file-folder-title">
            <span class="text-sm font-medium text-slate-700 dark:text-slate-200">Название</span>
            <input
              id="file-folder-title"
              v-model="title"
              class="h-10 min-w-0 rounded-md border border-slate-300 px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50 dark:focus:ring-blue-950"
              type="text"
              maxlength="120"
              placeholder="Например, Материалы выпуска"
              :disabled="isSubmitting"
              autofocus
            >
          </label>

          <label class="flex items-start gap-3 rounded-md border border-slate-200 px-3 py-3 dark:border-slate-700">
            <input
              v-model="isPrivate"
              class="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-950"
              type="checkbox"
              :disabled="isSubmitting"
            >
            <span class="min-w-0">
              <span class="block text-sm font-medium text-slate-800 dark:text-slate-100">Скрытая папка</span>
              <span class="mt-1 block text-xs leading-5 text-slate-500 dark:text-slate-400">
                Папку и всё содержимое будут видеть только владелец и суперадминистратор.
              </span>
            </span>
          </label>
        </div>

        <footer class="flex justify-end gap-2 border-t border-slate-200 px-5 py-4 dark:border-slate-700">
          <button
            class="inline-flex min-h-10 items-center justify-center rounded-md border border-slate-300 px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            type="button"
            :disabled="isSubmitting"
            @click="close"
          >
            Отмена
          </button>
          <button
            class="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-blue-600 px-4 text-sm font-medium text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
            type="submit"
            :disabled="isSubmitting"
          >
            <FolderPlusIcon class="h-4 w-4" aria-hidden="true" />
            Создать
          </button>
        </footer>
      </form>
    </template>
  </ModalHost>
</template>
