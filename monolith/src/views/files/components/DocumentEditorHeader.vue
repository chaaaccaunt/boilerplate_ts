<script lang="ts" setup>
import type { Editor } from "@tiptap/vue-3"
import "@tiptap/starter-kit"
import "@tiptap/extension-text-align"
import "@tiptap/extension-underline"
import {
  AlignCenterIcon, AlignLeftIcon, AlignRightIcon, ArrowLeftIcon, BoldIcon, Columns3Icon,
  DownloadIcon, EraserIcon, FileTextIcon, ImageIcon, IndentDecreaseIcon, IndentIncreaseIcon,
  ItalicIcon, LinkIcon, ListIcon, ListOrderedIcon, MinusIcon, PilcrowIcon, Redo2Icon, Rows3Icon,
  SaveIcon, ScissorsIcon, SplitSquareHorizontalIcon, StrikethroughIcon, TableIcon, Undo2Icon, UnderlineIcon
} from "@lucide/vue"
import { fontFamilies, fontSizes, lineHeights } from "../document-editor-config"
import type { DocumentImageAlignment, DocumentImageAttributes, DocumentImageCrop, DocumentImageWrap } from "../document-editor-image"
import DocumentImageSettings from "./DocumentImageSettings.vue"

interface HeaderActions {
  goBack: () => void
  renameDocument: () => void
  saveDocument: () => Promise<void>
  downloadDocument: () => void
  openFinalizeModal: () => void
  setBlockStyle: (event: Event) => void
  setFontFamily: (event: Event) => void
  setFontSize: (event: Event) => void
  setLineHeight: (event: Event) => void
  setTextColor: (event: Event) => void
  setBackgroundColor: (event: Event) => void
  clearFormatting: () => void
  decreaseIndent: () => void
  increaseIndent: () => void
  openTableModal: () => void
  addTableColumnBefore: () => void
  addTableColumnAfter: () => void
  deleteTableColumn: () => void
  addTableRowBefore: () => void
  addTableRowAfter: () => void
  deleteTableRow: () => void
  mergeTableCells: () => void
  splitTableCell: () => void
  toggleTableHeaderRow: () => void
  toggleTableHeaderColumn: () => void
  deleteTable: () => void
  openImageModal: () => void
  openAttachmentModal: () => void
  insertLink: () => void
  setImageWidth: (value: number) => void
  setImageAlignment: (value: DocumentImageAlignment) => void
  setImageWrap: (value: DocumentImageWrap) => void
  rotateImage: (degrees: number) => void
  setImageCrop: (value: DocumentImageCrop) => void
  setImageCaption: (value: string) => void
  removeImage: () => void
}

defineProps<{
  editor: Editor | null
  document: iSharedFiles.StoredDocumentDto | null
  isReadonly: boolean
  canManageDocument: boolean
  isSaving: boolean
  isDirty: boolean
  saveStateText: string
  isTableActive: boolean
  canMergeTableCells: boolean
  isImageActive: boolean
  imageAttributes: DocumentImageAttributes
  actions: HeaderActions
}>()
</script>

<template>
<header class="border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
  <div class="flex flex-wrap items-center justify-between gap-3">
    <div class="flex min-w-0 items-center gap-3">
      <button
        class="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        type="button"
        aria-label="Назад"
        @click="actions.goBack"
      >
        <ArrowLeftIcon class="h-4 w-4" aria-hidden="true" />
      </button>
      <div class="min-w-0">
        <button
          class="block max-w-[42rem] truncate text-left text-lg font-semibold text-slate-950 hover:text-blue-700 disabled:hover:text-slate-950 dark:text-slate-50 dark:hover:text-blue-200 dark:disabled:hover:text-slate-50"
          type="button"
          :disabled="isReadonly"
          @click="actions.renameDocument"
        >
          {{ document?.title || "Документ" }}
        </button>
        <div class="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span>{{ saveStateText }}</span>
          <span v-if="isDirty">Автосохранение включено</span>
          <span v-if="document?.status === 'final'">Только просмотр</span>
        </div>
      </div>
    </div>

    <div class="flex flex-wrap items-center gap-2">
      <button
        class="inline-flex min-h-9 items-center justify-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        type="button"
        :disabled="isSaving || isReadonly"
        @click="actions.saveDocument"
      >
        <SaveIcon class="h-4 w-4" aria-hidden="true" />
        Сохранить
      </button>
      <button
        class="inline-flex min-h-9 items-center justify-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        type="button"
        @click="actions.downloadDocument"
      >
        <DownloadIcon class="h-4 w-4" aria-hidden="true" />
        DOCX
      </button>
      <button
        v-if="document?.status === 'draft' && canManageDocument"
        class="inline-flex min-h-9 items-center justify-center gap-2 rounded-md bg-blue-600 px-3 text-sm font-medium text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-400"
        type="button"
        :disabled="isSaving"
        @click="actions.openFinalizeModal"
      >
        <FileTextIcon class="h-4 w-4" aria-hidden="true" />
        Завершить
      </button>
    </div>
  </div>

  <div v-if="!isReadonly" class="mt-3 flex flex-wrap items-center gap-2">
    <div class="editor-toolbar-group" data-label="История">
      <button class="editor-button" type="button" aria-label="Отменить" title="Отменить" @click="editor?.chain().focus().undo().run()">
        <Undo2Icon class="h-4 w-4" aria-hidden="true" />
      </button>
      <button class="editor-button" type="button" aria-label="Повторить" title="Повторить" @click="editor?.chain().focus().redo().run()">
        <Redo2Icon class="h-4 w-4" aria-hidden="true" />
      </button>
    </div>

    <div class="editor-toolbar-group" data-label="Шрифт">
      <select class="editor-select w-36" aria-label="Стиль текста" @change="actions.setBlockStyle">
        <option value="paragraph">Обычный текст</option>
        <option value="heading-1">Заголовок 1</option>
        <option value="heading-2">Заголовок 2</option>
        <option value="heading-3">Заголовок 3</option>
      </select>
      <select class="editor-select w-40" aria-label="Шрифт" @change="actions.setFontFamily">
        <option value="">Шрифт</option>
        <option v-for="font in fontFamilies" :key="font.value" :value="font.value">
          {{ font.label }}
        </option>
      </select>
      <select class="editor-select w-24" aria-label="Размер шрифта" @change="actions.setFontSize">
        <option value="">Размер</option>
        <option v-for="fontSize in fontSizes" :key="fontSize" :value="fontSize">
          {{ fontSize }}
        </option>
      </select>
      <select class="editor-select w-24" aria-label="Межстрочный интервал" @change="actions.setLineHeight">
        <option value="">Интервал</option>
        <option v-for="lineHeight in lineHeights" :key="lineHeight.value" :value="lineHeight.value">
          {{ lineHeight.label }}
        </option>
      </select>
    </div>

    <div class="editor-toolbar-group" data-label="Текст">
      <button class="editor-button" type="button" aria-label="Жирный" title="Жирный" @click="editor?.chain().focus().toggleBold().run()">
      <BoldIcon class="h-4 w-4" aria-hidden="true" />
      </button>
      <button class="editor-button" type="button" aria-label="Курсив" title="Курсив" @click="editor?.chain().focus().toggleItalic().run()">
        <ItalicIcon class="h-4 w-4" aria-hidden="true" />
      </button>
      <button class="editor-button" type="button" aria-label="Подчеркнутый" title="Подчеркнутый" @click="editor?.chain().focus().toggleUnderline().run()">
        <UnderlineIcon class="h-4 w-4" aria-hidden="true" />
      </button>
      <button class="editor-button" type="button" aria-label="Зачеркнутый" title="Зачеркнутый" @click="editor?.chain().focus().toggleStrike().run()">
        <StrikethroughIcon class="h-4 w-4" aria-hidden="true" />
      </button>
      <label class="editor-color" title="Цвет текста">
        <span class="sr-only">Цвет текста</span>
        <input type="color" value="#0f172a" @input="actions.setTextColor">
      </label>
      <label class="editor-color" title="Цвет фона текста">
        <span class="sr-only">Цвет фона текста</span>
        <input type="color" value="#fff7cc" @input="actions.setBackgroundColor">
      </label>
      <button class="editor-button" type="button" aria-label="Очистить форматирование" title="Очистить форматирование" @click="actions.clearFormatting">
        <EraserIcon class="h-4 w-4" aria-hidden="true" />
      </button>
    </div>

    <div class="editor-toolbar-group" data-label="Абзац">
      <button class="editor-button" type="button" aria-label="Маркированный список" title="Маркированный список" @click="editor?.chain().focus().toggleBulletList().run()">
        <ListIcon class="h-4 w-4" aria-hidden="true" />
      </button>
      <button class="editor-button" type="button" aria-label="Нумерованный список" title="Нумерованный список" @click="editor?.chain().focus().toggleOrderedList().run()">
        <ListOrderedIcon class="h-4 w-4" aria-hidden="true" />
      </button>
      <button class="editor-button" type="button" aria-label="Уменьшить отступ" title="Уменьшить отступ" @click="actions.decreaseIndent">
        <IndentDecreaseIcon class="h-4 w-4" aria-hidden="true" />
      </button>
      <button class="editor-button" type="button" aria-label="Увеличить отступ" title="Увеличить отступ" @click="actions.increaseIndent">
        <IndentIncreaseIcon class="h-4 w-4" aria-hidden="true" />
      </button>
      <button class="editor-button" type="button" aria-label="Абзац" title="Абзац" @click="editor?.chain().focus().setParagraph().run()">
        <PilcrowIcon class="h-4 w-4" aria-hidden="true" />
      </button>
    </div>

    <div class="editor-toolbar-group" data-label="Выравнивание текста">
      <button class="editor-button" type="button" aria-label="По левому краю" title="По левому краю" @click="editor?.chain().focus().setTextAlign('left').run()">
        <AlignLeftIcon class="h-4 w-4" aria-hidden="true" />
      </button>
      <button class="editor-button" type="button" aria-label="По центру" title="По центру" @click="editor?.chain().focus().setTextAlign('center').run()">
        <AlignCenterIcon class="h-4 w-4" aria-hidden="true" />
      </button>
      <button class="editor-button" type="button" aria-label="По правому краю" title="По правому краю" @click="editor?.chain().focus().setTextAlign('right').run()">
        <AlignRightIcon class="h-4 w-4" aria-hidden="true" />
      </button>
      <button class="editor-button" type="button" aria-label="Горизонтальная линия" title="Горизонтальная линия" @click="editor?.chain().focus().setHorizontalRule().run()">
        <MinusIcon class="h-4 w-4" aria-hidden="true" />
      </button>
    </div>

    <div class="editor-toolbar-group" data-label="Таблица">
      <button class="editor-button" type="button" aria-label="Таблица" title="Вставить таблицу" @click="actions.openTableModal">
        <TableIcon class="h-4 w-4" aria-hidden="true" />
      </button>
      <button class="editor-button" type="button" :disabled="!isTableActive" aria-label="Колонка слева" title="Колонка слева" @click="actions.addTableColumnBefore">
        <Columns3Icon class="h-4 w-4" aria-hidden="true" />
      </button>
      <button class="editor-button" type="button" :disabled="!isTableActive" aria-label="Колонка справа" title="Колонка справа" @click="actions.addTableColumnAfter">
        <Columns3Icon class="h-4 w-4 rotate-180" aria-hidden="true" />
      </button>
      <button class="editor-button" type="button" :disabled="!isTableActive" aria-label="Удалить колонку" title="Удалить колонку" @click="actions.deleteTableColumn">
        <ScissorsIcon class="h-4 w-4" aria-hidden="true" />
      </button>
      <button class="editor-button" type="button" :disabled="!isTableActive" aria-label="Строка выше" title="Строка выше" @click="actions.addTableRowBefore">
        <Rows3Icon class="h-4 w-4" aria-hidden="true" />
      </button>
      <button class="editor-button" type="button" :disabled="!isTableActive" aria-label="Строка ниже" title="Строка ниже" @click="actions.addTableRowAfter">
        <Rows3Icon class="h-4 w-4 rotate-180" aria-hidden="true" />
      </button>
      <button class="editor-button" type="button" :disabled="!isTableActive" aria-label="Удалить строку" title="Удалить строку" @click="actions.deleteTableRow">
        <ScissorsIcon class="h-4 w-4 rotate-90" aria-hidden="true" />
      </button>
      <button class="editor-button" type="button" :disabled="!canMergeTableCells" aria-label="Объединить ячейки" title="Выделите несколько соседних ячеек протягиванием или с Shift" @click="actions.mergeTableCells">
        <SplitSquareHorizontalIcon class="h-4 w-4 rotate-90" aria-hidden="true" />
      </button>
      <button class="editor-button" type="button" :disabled="!isTableActive" aria-label="Разделить ячейку" title="Разделить ячейку" @click="actions.splitTableCell">
        <SplitSquareHorizontalIcon class="h-4 w-4" aria-hidden="true" />
      </button>
      <button class="editor-text-button" type="button" :disabled="!isTableActive" title="Строка заголовка" @click="actions.toggleTableHeaderRow">
        H-строка
      </button>
      <button class="editor-text-button" type="button" :disabled="!isTableActive" title="Колонка заголовка" @click="actions.toggleTableHeaderColumn">
        H-колонка
      </button>
      <button class="editor-text-button text-red-600 dark:text-red-300" type="button" :disabled="!isTableActive" title="Удалить таблицу" @click="actions.deleteTable">
        Удалить
      </button>
    </div>

    <div class="editor-toolbar-group" data-label="Вставка">
      <button class="editor-button" type="button" aria-label="Добавить изображение" title="Добавить изображение" @click="actions.openImageModal">
        <ImageIcon class="h-4 w-4" aria-hidden="true" />
      </button>
      <button class="editor-button" type="button" aria-label="Загрузить изображение или PDF" title="Загрузить изображение или PDF" @click="actions.openAttachmentModal">
        <FileTextIcon class="h-4 w-4" aria-hidden="true" />
      </button>
      <button class="editor-button" type="button" aria-label="Ссылка" title="Ссылка" @click="actions.insertLink">
        <LinkIcon class="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  </div>

  <DocumentImageSettings
    v-if="!isReadonly && isImageActive"
    :attributes="imageAttributes"
    :actions="{ setWidth: actions.setImageWidth, setAlignment: actions.setImageAlignment, setWrap: actions.setImageWrap, rotate: actions.rotateImage, setCrop: actions.setImageCrop, setCaption: actions.setImageCaption, remove: actions.removeImage }"
  />

</header>
</template>
