<template>
    <NodeViewWrapper class="resizable-image-wrapper" :class="{ selected: selected && isEditable }">
        <div class="resizable-image-container" :style="{ width: displayWidth }">
            <img :src="node.attrs.src" :alt="node.attrs.alt || ''" :title="node.attrs.title || ''" draggable="false" />
            <!-- 右下角拖拽调整大小 -->
            <div v-if="selected && isEditable" class="resize-handle se" @mousedown.prevent="startResize($event, 'se')" />
            <!-- 右侧拖拽 -->
            <div v-if="selected && isEditable" class="resize-handle e" @mousedown.prevent="startResize($event, 'e')" />
        </div>
    </NodeViewWrapper>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { NodeViewWrapper } from '@tiptap/vue-3'

const props = defineProps({
    editor: { type: Object, required: true },
    node: { type: Object, required: true },
    decorations: { type: Array, required: true },
    selected: { type: Boolean, required: true },
    extension: { type: Object, required: true },
    getPos: { type: Function, required: true },
    updateAttributes: { type: Function, required: true },
    deleteNode: { type: Function, required: true },
})

const isEditable = ref(props.editor.isEditable)

function syncEditable() {
    isEditable.value = props.editor.isEditable
}

onMounted(() => {
    props.editor.on('transaction', syncEditable)
})

onBeforeUnmount(() => {
    props.editor.off('transaction', syncEditable)
})

const displayWidth = computed(() => {
    const w = props.node.attrs.width
    if (!w) return 'auto'
    return typeof w === 'number' ? `${w}px` : w
})

function startResize(e, _direction) {
    e.preventDefault()

    const container = e.target.closest('.resizable-image-container')
    const startX = e.clientX
    const startWidth = container.offsetWidth

    function onMouseMove(ev) {
        const delta = ev.clientX - startX
        const newWidth = Math.round(Math.max(80, startWidth + delta))
        props.updateAttributes({ width: newWidth })
    }

    function onMouseUp() {
        document.removeEventListener('mousemove', onMouseMove)
        document.removeEventListener('mouseup', onMouseUp)
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
}
</script>

<style scoped lang="scss" src="@/assets/styles/components/ResizableImageView.scss"></style>
