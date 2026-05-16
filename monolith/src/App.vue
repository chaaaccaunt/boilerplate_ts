<script lang="ts" setup>
import { computed } from "vue"
import { useRoute } from "vue-router"
import LoginLayout from "./layouts/login/LoginLayout.vue"
import MainLayout from "./layouts/main/MainLayout.vue"

const route = useRoute()

const layouts = {
  main: MainLayout,
  login: LoginLayout
}

const resolveLayout = computed(() => layouts[route.meta.requiresAuthorization ? "main" : "login"])
</script>

<template>
  <component :is="resolveLayout"></component>
</template>
