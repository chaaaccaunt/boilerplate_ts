<template>
  <main class="main-layout">
    <div class="container py-4">
      <slot />
    </div>
  </main>
</template>

<style lang="scss" scoped>
.main-layout {
  min-height: 100vh;
  color: #212529;
  background: #f8f9fa;
}
</style>
