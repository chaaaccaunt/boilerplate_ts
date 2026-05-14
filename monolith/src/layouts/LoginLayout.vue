<template>
  <main class="login-layout">
    <div class="login-layout__content">
      <router-view></router-view>
    </div>
  </main>
</template>

<style lang="scss" scoped>
.login-layout {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: #f8f9fa;
}

.login-layout__content {
  width: 100%;
  max-width: 420px;
}
</style>
