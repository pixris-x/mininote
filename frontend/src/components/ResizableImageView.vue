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

function startResize(e, direction) {
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

<style scoped>
.resizable-image-wrapper {
    display: block;
    line-height: 0;
    margin: 8px 0;
}

.resizable-image-container {
    position: relative;
    display: inline-block;
    max-width: 100%;
    cursor: default;
}

.resizable-image-container img {
    display: block;
    width: 100%;
    height: auto;
    border-radius: 8px;
}

/* 选中时高亮边框 */
.selected .resizable-image-container {
    outline: 2px solid #6c6ef0;
    outline-offset: 1px;
    border-radius: 9px;
}

/* 拖拽手柄 */
.resize-handle {
    position: absolute;
    background: #6c6ef0;
    border: 2px solid #fff;
    border-radius: 50%;
    z-index: 10;
}

/* 右下角 */
.resize-handle.se {
    width: 12px;
    height: 12px;
    bottom: -6px;
    right: -6px;
    cursor: se-resize;
}

/* 右侧中间 */
.resize-handle.e {
    width: 10px;
    height: 10px;
    top: 50%;
    right: -5px;
    transform: translateY(-50%);
    cursor: e-resize;
}
</style>
