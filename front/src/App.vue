<script lang="ts" setup>
import MainLayout from "./layouts/MainLayout.vue";
import LoginLayout from "./layouts/LoginLayout.vue";
import { computed } from "vue";
import { useRoute } from "vue-router";

const route = useRoute();

const layouts = {
  main: MainLayout,
  login: LoginLayout,
};

const resolveLayout = computed(() => layouts[route.meta.requiresAuthorization ? "main" : "login"]);
</script>

<template>
  <component :is="resolveLayout">
    <router-view />
  </component>
</template>

<style lang="scss"></style>

