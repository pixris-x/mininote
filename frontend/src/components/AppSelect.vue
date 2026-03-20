<template>
  <div class="asl-wrap" ref="wrapRef">
    <button
      type="button"
      class="asl-trigger"
      :class="{ 'asl-trigger--open': open, 'asl-trigger--disabled': disabled }"
      :disabled="disabled"
      :aria-expanded="open ? 'true' : 'false'"
      aria-haspopup="listbox"
      @click="toggle"
      @keydown.esc.prevent="closePanel"
    >
      <span class="asl-value" :class="{ placeholder: !selectedOption }">
        {{ selectedOption ? selectedOption.label : placeholder }}
      </span>

      <span class="asl-right">
        <span
          v-if="clearable && selectedOption && !disabled"
          class="asl-clear"
          role="button"
          aria-label="清除选择"
          @click.stop="clearValue"
        >
          <svg viewBox="0 0 16 16" fill="none">
            <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
          </svg>
        </span>
        <svg class="asl-caret" viewBox="0 0 16 16" fill="none">
          <path d="M4 6.5 8 10.5l4-4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </span>
    </button>

    <Teleport to="body">
      <Transition name="asl-fade">
        <div
          v-if="open"
          ref="panelRef"
          class="asl-panel"
          :style="panelStyle"
          role="listbox"
        >
          <button
            v-for="opt in normalizedOptions"
            :key="`opt-${String(opt.value)}`"
            type="button"
            class="asl-option"
            :class="{ active: isActive(opt.value), disabled: opt.disabled }"
            :disabled="opt.disabled"
            role="option"
            :aria-selected="isActive(opt.value) ? 'true' : 'false'"
            @click="selectValue(opt.value)"
          >
            <span class="asl-option-label">{{ opt.label }}</span>
            <span v-if="isActive(opt.value)" class="asl-check">✓</span>
          </button>
          <div v-if="!normalizedOptions.length" class="asl-empty">暂无选项</div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps({
  modelValue: {
    type: [String, Number, Boolean],
    default: ''
  },
  options: {
    type: Array,
    default: () => []
  },
  placeholder: {
    type: String,
    default: '请选择'
  },
  disabled: {
    type: Boolean,
    default: false
  },
  clearable: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'change'])

const open = ref(false)
const wrapRef = ref(null)
const panelRef = ref(null)
const panelStyle = ref({})

const normalizedOptions = computed(() => {
  return (Array.isArray(props.options) ? props.options : []).map(item => ({
    label: String(item?.label ?? ''),
    value: item?.value,
    disabled: Boolean(item?.disabled)
  }))
})

const selectedOption = computed(() =>
  normalizedOptions.value.find(item => isSameValue(item.value, props.modelValue))
)

function isSameValue(a, b) {
  if (a == null && b == null) return true
  return String(a) === String(b)
}

function isActive(value) {
  return isSameValue(value, props.modelValue)
}

function toggle() {
  if (props.disabled) return
  if (open.value) closePanel()
  else openPanel()
}

async function openPanel() {
  open.value = true
  await nextTick()
  positionPanel()
}

function closePanel() {
  open.value = false
}

function selectValue(value) {
  emit('update:modelValue', value)
  emit('change', value)
  closePanel()
}

function clearValue() {
  emit('update:modelValue', '')
  emit('change', '')
  closePanel()
}

function positionPanel() {
  if (!wrapRef.value || !panelRef.value) return
  const rect = wrapRef.value.getBoundingClientRect()
  const panelHeight = panelRef.value.offsetHeight || 220
  const gap = 6
  const spaceBelow = window.innerHeight - rect.bottom
  const top = spaceBelow >= panelHeight + gap
    ? rect.bottom + window.scrollY + gap
    : rect.top + window.scrollY - panelHeight - gap
  const maxLeft = window.innerWidth - rect.width - 8
  const left = Math.max(8, Math.min(rect.left + window.scrollX, maxLeft))

  panelStyle.value = {
    top: `${Math.max(8, top)}px`,
    left: `${left}px`,
    width: `${Math.max(128, rect.width)}px`
  }
}

function onOutsideClick(event) {
  if (!open.value) return
  if (wrapRef.value?.contains(event.target)) return
  if (panelRef.value?.contains(event.target)) return
  closePanel()
}

function onWindowChange() {
  if (open.value) nextTick(positionPanel)
}

watch(() => props.disabled, (val) => {
  if (val && open.value) closePanel()
})

watch(() => props.modelValue, () => {
  if (open.value) nextTick(positionPanel)
})

onMounted(() => {
  document.addEventListener('mousedown', onOutsideClick)
  window.addEventListener('resize', onWindowChange)
  window.addEventListener('scroll', onWindowChange, true)
})

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', onOutsideClick)
  window.removeEventListener('resize', onWindowChange)
  window.removeEventListener('scroll', onWindowChange, true)
})
</script>

<style scoped lang="scss" src="@/assets/styles/components/AppSelect.scss"></style>
