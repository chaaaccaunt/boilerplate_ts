<script lang="ts" setup>
const smmServiceUrl = "/smm"
</script>

<template>
  <section class="h-[calc(100vh-3.5rem)] min-h-0 bg-white dark:bg-slate-950">
    <iframe
      class="h-full w-full border-0"
      title="СММ"
      :src="smmServiceUrl"
    ></iframe>
  </section>
</template>
