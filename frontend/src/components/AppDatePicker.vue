<template>
  <div class="adp-wrap" ref="wrapRef">
    <!-- 触发输入框 -->
    <div class="adp-input"
      :class="{ 'adp-input--open': open, 'adp-input--filled': modelValue, 'adp-input--disabled': disabled }"
      @click="toggle">
      <svg class="adp-icon" viewBox="0 0 20 20" fill="none">
        <rect x="3" y="4" width="14" height="14" rx="3" stroke="currentColor" stroke-width="1.5" />
        <path d="M3 8h14" stroke="currentColor" stroke-width="1.5" />
        <path d="M7 2v3M13 2v3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
      </svg>
      <span class="adp-input-text" :class="{ placeholder: !modelValue }">
        {{ modelValue ? displayValue : placeholder }}
      </span>
      <button v-if="modelValue && clearable && !disabled" class="adp-clear" @click.stop="clear">
        <svg viewBox="0 0 16 16" fill="none">
          <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
        </svg>
      </button>
    </div>

    <!-- 日历面板 -->
    <Teleport to="body">
      <Transition name="adp-fade">
        <div v-if="open" class="adp-panel" :style="panelStyle" ref="panelRef">
          <!-- 头部：月份导航 -->
          <div class="adp-header">
            <button class="adp-nav" @click="prevYear" title="上一年">«</button>
            <button class="adp-nav" @click="prevMonth">‹</button>
            <span class="adp-title" @click="gotoToday">{{ cursor.format('YYYY年 M月') }}</span>
            <button class="adp-nav" @click="nextMonth">›</button>
            <button class="adp-nav" @click="nextYear" title="下一年">»</button>
          </div>
          <!-- 星期行 -->
          <div class="adp-weekdays">
            <span v-for="d in weekdays" :key="d">{{ d }}</span>
          </div>
          <!-- 日期格 -->
          <div class="adp-days">
            <button v-for="cell in cells" :key="cell.key" class="adp-day" :class="{
              'adp-day--other': cell.other,
              'adp-day--today': cell.isToday,
              'adp-day--selected': cell.isSelected,
              'adp-day--disabled': cell.disabled,
            }" :disabled="cell.disabled" @click="selectDay(cell)">{{ cell.d }}</button>
          </div>
          <!-- 底部快捷 -->
          <div class="adp-footer">
            <button class="adp-today-btn" @click="selectToday">今天</button>
            <button v-if="clearable && modelValue" class="adp-clear-btn" @click="clear">清除</button>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import dayjs from 'dayjs'

const props = defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: '选择日期' },
  clearable: { type: Boolean, default: true },
  minDate: { type: [String, Date], default: undefined },
  maxDate: { type: [String, Date], default: undefined },
  disabled: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue'])

const weekdays = ['日', '一', '二', '三', '四', '五', '六']
const open = ref(false)
const wrapRef = ref(null)
const panelRef = ref(null)
const panelStyle = ref({})

const today = dayjs().startOf('day')
const cursor = ref(
  props.modelValue ? dayjs(props.modelValue).startOf('month') : today.startOf('month')
)

const displayValue = computed(() =>
  props.modelValue ? dayjs(props.modelValue).format('YYYY年M月D日') : ''
)

const minDayjs = computed(() => props.minDate ? dayjs(props.minDate).startOf('day') : null)
const maxDayjs = computed(() => props.maxDate ? dayjs(props.maxDate).startOf('day') : null)

function isDisabled(d) {
  if (minDayjs.value && d.isBefore(minDayjs.value)) return true
  if (maxDayjs.value && d.isAfter(maxDayjs.value)) return true
  return false
}

const cells = computed(() => {
  const start = cursor.value.startOf('month')
  const firstDow = start.day()
  const rows = []
  let day = start.subtract(firstDow, 'day')
  for (let i = 0; i < 42; i++) {
    const d = day
    rows.push({
      key: d.format('YYYY-MM-DD'),
      d: d.date(),
      date: d,
      other: d.month() !== cursor.value.month(),
      isToday: d.isSame(today, 'day'),
      isSelected: props.modelValue ? d.isSame(dayjs(props.modelValue), 'day') : false,
      disabled: isDisabled(d),
    })
    day = day.add(1, 'day')
  }
  return rows
})

function toggle() {
  if (props.disabled) return
  open.value ? close() : openPanel()
}

async function openPanel() {
  if (props.modelValue) cursor.value = dayjs(props.modelValue).startOf('month')
  open.value = true
  await nextTick()
  positionPanel()
}

function close() { open.value = false }

function positionPanel() {
  if (!wrapRef.value || !panelRef.value) return
  const rect = wrapRef.value.getBoundingClientRect()
  const panelH = panelRef.value.offsetHeight || 320
  const spaceBelow = window.innerHeight - rect.bottom
  const top = spaceBelow > panelH + 8
    ? rect.bottom + window.scrollY + 6
    : rect.top + window.scrollY - panelH - 6
  const left = Math.min(rect.left + window.scrollX, window.innerWidth - 280 - 8)
  panelStyle.value = { top: top + 'px', left: Math.max(8, left) + 'px' }
}

function selectDay(cell) {
  if (cell.disabled) return
  emit('update:modelValue', cell.key)
  close()
}

function selectToday() {
  if (isDisabled(today)) return
  emit('update:modelValue', today.format('YYYY-MM-DD'))
  close()
}

function clear() { emit('update:modelValue', ''); close() }

function prevMonth() { cursor.value = cursor.value.subtract(1, 'month') }
function nextMonth() { cursor.value = cursor.value.add(1, 'month') }
function prevYear() { cursor.value = cursor.value.subtract(1, 'year') }
function nextYear() { cursor.value = cursor.value.add(1, 'year') }
function gotoToday() { cursor.value = today.startOf('month') }

function onOutsideClick(e) {
  if (!open.value) return
  if (wrapRef.value?.contains(e.target)) return
  if (panelRef.value?.contains(e.target)) return
  close()
}

onMounted(() => document.addEventListener('mousedown', onOutsideClick))
onBeforeUnmount(() => document.removeEventListener('mousedown', onOutsideClick))
watch(open, v => { if (v) nextTick(positionPanel) })
</script>

<style scoped lang="scss" src="@/assets/styles/components/AppDatePicker.scss"></style>
