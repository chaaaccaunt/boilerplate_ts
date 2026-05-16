<script lang="ts" setup>
import { LogOutIcon, XIcon } from "@lucide/vue"
import ModalHost from "@/application/providers/ModalHost.vue"

defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (event: "update:modelValue", value: boolean): void
  (event: "confirm"): void
}>()
</script>

<template>
  <ModalHost
    :model-value="modelValue"
    labelled-by="logout-modal-title"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <template #default="{ close }">
      <header class="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
        <h2 id="logout-modal-title" class="min-w-0 truncate text-base font-semibold text-slate-950">
          Завершить сессию?
        </h2>
        <button
          class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500"
          type="button"
          aria-label="Закрыть окно"
          @click="close"
        >
          <XIcon class="h-5 w-5" aria-hidden="true" />
        </button>
      </header>

      <div class="px-5 py-4 text-sm leading-6 text-slate-700">
        Текущая сессия будет завершена, а подключение к realtime будет закрыто.
      </div>

      <footer class="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">
        <button
          class="inline-flex min-h-10 items-center justify-center rounded-md border border-slate-300 px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          type="button"
          @click="close"
        >
          Отмена
        </button>
        <button
          class="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-red-600 px-4 text-sm font-medium text-white transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          type="button"
          @click="emit('confirm')"
        >
          <LogOutIcon class="h-4 w-4" aria-hidden="true" />
          Выйти
        </button>
      </footer>
    </template>
  </ModalHost>
</template>
