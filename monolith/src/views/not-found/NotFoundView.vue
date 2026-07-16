<script lang="ts" setup>
import { HomeIcon } from "@lucide/vue"
</script>

<template>
  <section class="flex min-h-[calc(100vh-3.5rem)] items-center justify-center bg-slate-50 px-4 py-10 text-slate-950 dark:bg-slate-950 dark:text-slate-50">
    <div class="w-full max-w-lg text-center">
      <div class="text-sm font-semibold uppercase text-blue-600 dark:text-blue-300">404</div>
      <h1 class="mt-3 text-3xl font-semibold">Страница не найдена</h1>
      <p class="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">
        Такой страницы нет или ссылка больше не актуальна.
      </p>

      <router-link
        class="mt-6 inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-blue-700 dark:hover:bg-blue-950/40 dark:hover:text-blue-200"
        :to="{ name: 'home' }"
      >
        <HomeIcon class="h-4 w-4" aria-hidden="true" />
        <span>На панель</span>
      </router-link>
    </div>
  </section>
</template>
