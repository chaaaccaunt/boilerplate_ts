<script lang="ts" setup>
import type { Editor } from "@tiptap/vue-3"
import { EditorContent } from "@tiptap/vue-3"
import type { ComponentPublicInstance, StyleValue } from "vue"
import { computed } from "vue"
import { horizontalRulerTicks, PAGE_HEIGHT_MM, PAGE_WIDTH_MM, verticalRulerTicks } from "../document-editor-config"

interface WorkspaceActions {
  setHorizontalRulerElement: (element: Element | ComponentPublicInstance | null) => void
  setVerticalRulerElement: (element: Element | ComponentPublicInstance | null) => void
  startHorizontalRulerDrag: (target: "left" | "right" | "indent", event: PointerEvent) => void
  startVerticalRulerDrag: (target: "top" | "bottom", event: PointerEvent) => void
}

defineProps<{
  editor: Editor | null
  errorMessage: string
  isLoading: boolean
  isReadonly: boolean
  horizontalRulerStyle: StyleValue
  verticalRulerStyle: StyleValue
  pageGuideStyle: StyleValue
  activeVerticalGuideClass: string
  activeHorizontalGuideClass: string
  actions: WorkspaceActions
}>()

const horizontalCentimeterTicks = computed(() => horizontalRulerTicks.filter((tick) => tick.isCentimeter))
const verticalCentimeterTicks = computed(() => verticalRulerTicks.filter((tick) => tick.isCentimeter))
</script>

<template>
<main class="min-h-0 overflow-auto bg-slate-100 px-3 pb-3 pt-0 dark:bg-slate-950">
  <div v-if="errorMessage" class="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
    {{ errorMessage }}
  </div>

  <div v-if="isLoading" class="rounded-md border border-slate-200 bg-white px-4 py-6 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
    Загрузка документа
  </div>

  <div v-else class="document-workspace mx-auto w-fit">
    <div class="document-ruler-frame">
      <div class="document-ruler-corner" aria-hidden="true">L</div>

      <div
        :ref="actions.setHorizontalRulerElement"
        class="document-horizontal-ruler"
        :style="horizontalRulerStyle"
        aria-label="Горизонтальная линейка документа"
      >
        <span class="ruler-page-area" aria-hidden="true" />
        <span
          v-for="tick in horizontalRulerTicks"
          :key="`horizontal-millimeter-${tick.millimeter}`"
          class="ruler-tick ruler-tick-horizontal"
          :class="{ 'ruler-tick-centimeter': tick.isCentimeter, 'ruler-tick-half': tick.isHalfCentimeter }"
          :style="{ left: `${(tick.millimeter / PAGE_WIDTH_MM) * 100}%` }"
          aria-hidden="true"
        />
        <span
          v-for="tick in horizontalCentimeterTicks"
          :key="`horizontal-centimeter-label-${tick.millimeter}`"
          class="ruler-centimeter-label ruler-centimeter-label-horizontal"
          :style="{ left: `${(tick.millimeter / PAGE_WIDTH_MM) * 100}%` }"
          aria-hidden="true"
        >
          {{ tick.millimeter / 10 }}
        </span>
        <button
          v-if="!isReadonly"
          class="ruler-marker ruler-marker-left"
          type="button"
          title="Левое поле"
          aria-label="Левое поле"
          @pointerdown="actions.startHorizontalRulerDrag('left', $event)"
        />
        <button
          v-if="!isReadonly"
          class="ruler-marker ruler-marker-indent"
          type="button"
          title="Отступ выбранного абзаца"
          aria-label="Отступ выбранного абзаца"
          @pointerdown="actions.startHorizontalRulerDrag('indent', $event)"
        />
        <button
          v-if="!isReadonly"
          class="ruler-marker ruler-marker-right"
          type="button"
          title="Правое поле"
          aria-label="Правое поле"
          @pointerdown="actions.startHorizontalRulerDrag('right', $event)"
        />
      </div>

      <div
        :ref="actions.setVerticalRulerElement"
        class="document-vertical-ruler"
        :style="verticalRulerStyle"
        aria-label="Вертикальная линейка документа"
      >
        <span class="ruler-page-area" aria-hidden="true" />
        <span
          v-for="tick in verticalRulerTicks"
          :key="`vertical-millimeter-${tick.millimeter}`"
          class="ruler-tick ruler-tick-vertical"
          :class="{ 'ruler-tick-centimeter': tick.isCentimeter, 'ruler-tick-half': tick.isHalfCentimeter }"
          :style="{ top: `${(tick.millimeter / PAGE_HEIGHT_MM) * 100}%` }"
          aria-hidden="true"
        />
        <span
          v-for="tick in verticalCentimeterTicks"
          :key="`vertical-centimeter-label-${tick.millimeter}`"
          class="ruler-centimeter-label ruler-centimeter-label-vertical"
          :style="{ top: `${(tick.millimeter / PAGE_HEIGHT_MM) * 100}%` }"
          aria-hidden="true"
        >
          {{ tick.millimeter / 10 }}
        </span>
        <button
          v-if="!isReadonly"
          class="ruler-marker ruler-marker-top"
          type="button"
          title="Верхнее поле"
          aria-label="Верхнее поле"
          @pointerdown="actions.startVerticalRulerDrag('top', $event)"
        />
        <button
          v-if="!isReadonly"
          class="ruler-marker ruler-marker-bottom"
          type="button"
          title="Нижнее поле"
          aria-label="Нижнее поле"
          @pointerdown="actions.startVerticalRulerDrag('bottom', $event)"
        />
      </div>

      <div class="document-page-slot" :style="pageGuideStyle">
        <span
          v-if="activeVerticalGuideClass"
          class="document-guide document-guide-vertical"
          :class="activeVerticalGuideClass"
          aria-hidden="true"
        />
        <span
          v-if="activeHorizontalGuideClass"
          class="document-guide document-guide-horizontal"
          :class="activeHorizontalGuideClass"
          aria-hidden="true"
        />
        <EditorContent
          v-if="editor"
          class="document-editor-content"
          :editor="editor"
        />
      </div>
    </div>
  </div>
</main>
</template>
