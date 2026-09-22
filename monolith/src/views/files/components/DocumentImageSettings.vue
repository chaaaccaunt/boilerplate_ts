<script lang="ts" setup>
import { RotateCcwIcon, RotateCwIcon, Trash2Icon } from "@lucide/vue"
import type { DocumentImageAttributes, DocumentImageAlignment, DocumentImageCrop, DocumentImageWrap } from "../document-editor-image"

interface ImageSettingsActions {
  setWidth: (value: number) => void
  setAlignment: (value: DocumentImageAlignment) => void
  setWrap: (value: DocumentImageWrap) => void
  rotate: (degrees: number) => void
  setCrop: (value: DocumentImageCrop) => void
  setCaption: (value: string) => void
  remove: () => void
}

defineProps<{ attributes: DocumentImageAttributes, actions: ImageSettingsActions }>()

function getInputValue(event: Event): string {
  return (event.target as HTMLInputElement).value
}
</script>

<template>
  <div class="mt-3 flex flex-wrap items-end gap-2 rounded-md border border-blue-200 bg-blue-50 p-2 dark:border-blue-900 dark:bg-blue-950/30" aria-label="Настройки изображения">
    <span class="self-center text-xs font-semibold uppercase tracking-wide text-blue-800 dark:text-blue-200">Изображение</span>
    <label class="grid gap-1 text-xs text-slate-600 dark:text-slate-300">
      Размер: {{ attributes.widthPercent }}%
      <input class="w-36 accent-blue-600" type="range" min="10" max="100" step="5" :value="attributes.widthPercent" @input="actions.setWidth(Number(getInputValue($event)))">
    </label>
    <label class="grid gap-1 text-xs text-slate-600 dark:text-slate-300">
      Выравнивание
      <select class="editor-select w-32" :value="attributes.alignment" :disabled="attributes.wrap !== 'none'" @change="actions.setAlignment(getInputValue($event) as DocumentImageAlignment)">
        <option value="left">Слева</option><option value="center">По центру</option><option value="right">Справа</option>
      </select>
    </label>
    <label class="grid gap-1 text-xs text-slate-600 dark:text-slate-300">
      Обтекание
      <select class="editor-select w-36" :value="attributes.wrap" @change="actions.setWrap(getInputValue($event) as DocumentImageWrap)">
        <option value="none">Нет</option><option value="left">Текст справа</option><option value="right">Текст слева</option>
      </select>
    </label>
    <label class="grid gap-1 text-xs text-slate-600 dark:text-slate-300">
      Кадрирование
      <select class="editor-select w-32" :value="attributes.crop" @change="actions.setCrop(getInputValue($event) as DocumentImageCrop)">
        <option value="original">Оригинал</option><option value="square">1:1</option><option value="4:3">4:3</option><option value="16:9">16:9</option>
      </select>
    </label>
    <label class="grid gap-1 text-xs text-slate-600 dark:text-slate-300">Подпись
      <input class="editor-select w-48" type="text" maxlength="255" :value="attributes.caption" placeholder="Без подписи" @change="actions.setCaption(getInputValue($event))">
    </label>
    <div class="flex gap-1">
      <button class="editor-button" type="button" title="Повернуть влево" aria-label="Повернуть изображение влево" @click="actions.rotate(-90)"><RotateCcwIcon class="h-4 w-4" aria-hidden="true" /></button>
      <button class="editor-button" type="button" title="Повернуть вправо" aria-label="Повернуть изображение вправо" @click="actions.rotate(90)"><RotateCwIcon class="h-4 w-4" aria-hidden="true" /></button>
      <button class="editor-button text-red-600 dark:text-red-300" type="button" title="Удалить изображение" aria-label="Удалить изображение" @click="actions.remove"><Trash2Icon class="h-4 w-4" aria-hidden="true" /></button>
    </div>
  </div>
</template>
