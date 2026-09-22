<script lang="ts" setup>
import { computed } from "vue"
import { NodeViewWrapper } from "@tiptap/vue-3"
import type { NodeViewProps } from "@tiptap/vue-3"

const props = defineProps<NodeViewProps>()
const cropAspectRatios: Readonly<Record<string, number>> = {
  square: 1,
  "4:3": 4 / 3,
  "16:9": 16 / 9
}
const sourceAspectRatio = computed(() => {
  const value = Number(props.node.attrs.sourceAspectRatio)
  return Number.isFinite(value) && value > 0 ? value : 1
})
const imageAspectRatio = computed(() => cropAspectRatios[String(props.node.attrs.crop)] || sourceAspectRatio.value)
const isQuarterTurn = computed(() => Math.abs(Number(props.node.attrs.rotation)) % 180 === 90)
const visualAspectRatio = computed(() => isQuarterTurn.value ? 1 / imageAspectRatio.value : imageAspectRatio.value)
const displayWidthPercent = computed(() => {
  const widthPercent = Number(props.node.attrs.widthPercent) || 60
  return isQuarterTurn.value ? widthPercent / imageAspectRatio.value : widthPercent
})
const imageStyle = computed(() => {
  const rotation = Number(props.node.attrs.rotation) || 0
  if (!isQuarterTurn.value) {
    return {
      width: "100%",
      height: "100%",
      transform: `translate(-50%, -50%) rotate(${rotation}deg)`
    }
  }
  return {
    width: `${imageAspectRatio.value * 100}%`,
    height: `${100 / imageAspectRatio.value}%`,
    transform: `translate(-50%, -50%) rotate(${rotation}deg)`
  }
})

function updateNaturalAspectRatio(event: Event): void {
  const image = event.target as HTMLImageElement
  if (image.naturalWidth > 0 && image.naturalHeight > 0) {
    const aspectRatio = image.naturalWidth / image.naturalHeight
    if (Math.abs(aspectRatio - sourceAspectRatio.value) > 0.001) props.updateAttributes({ sourceAspectRatio: aspectRatio })
  }
}
</script>

<template>
  <NodeViewWrapper
    as="figure"
    class="document-image-node"
    :class="{ 'ProseMirror-selectednode': selected }"
    data-drag-handle
    draggable="true"
    :data-alignment="node.attrs.alignment"
    :data-wrap="node.attrs.wrap"
    :style="{
      width: `${displayWidthPercent}%`,
      float: node.attrs.wrap === 'none' ? undefined : node.attrs.wrap,
      margin: node.attrs.wrap === 'left' ? '0.5rem 1rem 0.5rem 0' : node.attrs.wrap === 'right' ? '0.5rem 0 0.5rem 1rem' : node.attrs.alignment === 'left' ? '0.75rem auto 0.75rem 0' : node.attrs.alignment === 'right' ? '0.75rem 0 0.75rem auto' : '0.75rem auto'
    }"
  >
    <div class="document-image-visual" :style="{ aspectRatio: String(visualAspectRatio) }">
      <img
        :src="node.attrs.src"
        :alt="node.attrs.alt || ''"
        :title="node.attrs.title || undefined"
        :data-crop="node.attrs.crop"
        :style="imageStyle"
        draggable="false"
        @load="updateNaturalAspectRatio"
      >
    </div>
    <figcaption v-if="node.attrs.caption" class="document-image-caption">{{ node.attrs.caption }}</figcaption>
  </NodeViewWrapper>
</template>
