<script lang="ts" setup>
import { onBeforeUnmount, onMounted } from "vue"

const props = withDefaults(defineProps<{
  modelValue: boolean
  labelledBy?: string
  closeOnBackdrop?: boolean
  closeOnEscape?: boolean
}>(), {
  labelledBy: undefined,
  closeOnBackdrop: true,
  closeOnEscape: true
})

const emit = defineEmits<{
  (event: "update:modelValue", value: boolean): void
  (event: "close"): void
}>()

onMounted(() => {
  window.addEventListener("keydown", closeByEscape)
})

onBeforeUnmount(() => {
  window.removeEventListener("keydown", closeByEscape)
})

function closeByEscape(event: KeyboardEvent): void {
  if (!props.modelValue || !props.closeOnEscape || event.key !== "Escape") return
  close()
}

function closeByBackdrop(): void {
  if (!props.closeOnBackdrop) return
  close()
}

function close(): void {
  emit("update:modelValue", false)
  emit("close")
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="modelValue"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4"
      role="presentation"
      @click.self="closeByBackdrop"
    >
      <section
        class="w-full max-w-md rounded-lg border border-slate-200 bg-white shadow-xl"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="labelledBy"
      >
        <slot :close="close"></slot>
      </section>
    </div>
  </Teleport>
</template>
