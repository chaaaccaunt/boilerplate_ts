<script lang="ts" setup>
import { ThemePreferenceControl } from "@/features/theme"
</script>

<template>
  <section class="min-h-[calc(100vh-57px)] p-4 lg:p-6">
    <div class="mb-5">
      <h1 class="text-2xl font-semibold text-slate-950 dark:text-slate-50">Настройки</h1>
    </div>

    <div class="max-w-3xl rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div class="border-b border-slate-200 px-5 py-4 dark:border-slate-700">
        <h2 class="text-base font-semibold text-slate-950 dark:text-slate-50">Оформление</h2>
      </div>

      <div class="px-5 py-4">
        <ThemePreferenceControl />
      </div>
    </div>
  </section>
</template>
