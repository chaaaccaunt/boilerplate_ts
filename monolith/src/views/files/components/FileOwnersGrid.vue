<script lang="ts" setup>
defineProps<{
  owners: iSharedFiles.FileOwnerDto[]
}>()

const emit = defineEmits<{
  (event: "open-owner", owner: iSharedFiles.FileOwnerDto): void
}>()
</script>

<template>
  <div class="min-h-[360px]">
    <div v-if="!owners.length" class="rounded-md border border-slate-200 bg-white px-4 py-8 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
      Пользователи не найдены.
    </div>

    <div v-else class="grid grid-cols-[repeat(auto-fill,minmax(112px,1fr))] gap-x-6 gap-y-7">
      <button
        v-for="owner in owners"
        :key="owner.userUid"
        class="group flex min-h-28 w-28 flex-col items-center justify-start gap-2 rounded-md px-2 py-2 text-center transition hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:hover:bg-blue-950/40"
        type="button"
        @click="emit('open-owner', owner)"
      >
        <span class="relative h-16 w-24 shrink-0">
          <span class="absolute left-1 top-0 h-5 w-11 rounded-t-md bg-amber-400 shadow-sm dark:bg-amber-500"></span>
          <span class="absolute inset-x-0 bottom-0 h-14 rounded-md bg-amber-300 shadow-[inset_0_-10px_16px_rgba(217,119,6,0.18),0_1px_2px_rgba(15,23,42,0.2)] ring-1 ring-amber-400/80 dark:bg-amber-400 dark:ring-amber-300/80"></span>
        </span>
        <span class="line-clamp-2 w-full text-xs font-medium leading-4 text-slate-800 group-hover:text-blue-700 dark:text-slate-100 dark:group-hover:text-blue-100">
          {{ owner.fullName }}
        </span>
      </button>
    </div>
  </div>
</template>
