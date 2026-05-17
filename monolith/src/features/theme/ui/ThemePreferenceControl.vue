<script lang="ts" setup>
import { MonitorIcon, MoonIcon, SunIcon } from "@lucide/vue"
import { useTheme, type ThemePreference } from "../model/theme"

const { themePreference, resolvedTheme, setThemePreference } = useTheme()

const options: Array<{
  value: ThemePreference
  label: string
  description: string
  icon: typeof MonitorIcon
}> = [
  {
    value: "auto",
    label: "Автоматически",
    description: "Использовать тему системы",
    icon: MonitorIcon
  },
  {
    value: "light",
    label: "Светлая",
    description: "Всегда светлый интерфейс",
    icon: SunIcon
  },
  {
    value: "dark",
    label: "Темная",
    description: "Всегда темный интерфейс",
    icon: MoonIcon
  }
]
</script>

<template>
  <div class="grid gap-3">
    <div class="text-sm text-slate-600 dark:text-slate-300">
      Текущая тема: {{ resolvedTheme === "dark" ? "темная" : "светлая" }}
    </div>

    <div class="grid gap-2 sm:grid-cols-3">
      <button
        v-for="option in options"
        :key="option.value"
        class="min-h-24 rounded-md border p-3 text-left transition focus:outline-none focus:ring-2 focus:ring-blue-500"
        :class="themePreference === option.value
          ? 'border-blue-600 bg-blue-50 text-blue-950 dark:border-blue-400 dark:bg-blue-950/40 dark:text-blue-100'
          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'"
        type="button"
        @click="setThemePreference(option.value)"
      >
        <component :is="option.icon" class="mb-3 h-5 w-5" aria-hidden="true" />
        <div class="text-sm font-semibold">{{ option.label }}</div>
        <div class="mt-1 text-xs opacity-75">{{ option.description }}</div>
      </button>
    </div>
  </div>
</template>
