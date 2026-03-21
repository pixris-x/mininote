<template>
  <Teleport to="body">
    <Transition name="alert-fade">
      <div v-if="alertState" class="app-alert-overlay" @click.self="onCancel">
        <Transition name="alert-pop">
          <div v-if="alertState" class="app-alert-box" :class="`app-alert-box--${alertState.variant}`">
            <!-- 图标 -->
            <div class="app-alert-icon">
              <component v-if="alertIconComponent" :is="alertIconComponent" class="app-alert-icon-svg" />
              <span v-else>{{ alertState.icon }}</span>
            </div>

            <!-- 标题 -->
            <div class="app-alert-title">{{ alertState.title }}</div>

            <!-- 消息 -->
            <div class="app-alert-message">{{ alertState.message }}</div>

            <!-- 按钮组 -->
            <div class="app-alert-actions" :class="{ 'app-alert-actions--single': alertState.type === 'alert' }">
              <button
                v-if="alertState.type === 'confirm'"
                class="app-alert-btn app-alert-btn--cancel"
                @click="onCancel"
              >{{ alertState.cancelText }}</button>
              <button
                class="app-alert-btn app-alert-btn--confirm"
                :class="`app-alert-btn--${alertState.variant}`"
                @click="onConfirm"
                ref="confirmBtnRef"
              >{{ alertState.confirmText }}</button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed, ref, watch, nextTick } from 'vue'
import { CircleHelp, CircleAlert, Info, CheckCircle2 } from 'lucide-vue-next'
import { alertState } from '@/utils/alert'

const confirmBtnRef = ref(null)
const ALERT_ICON_COMPONENTS = {
  info: Info,
  help: CircleHelp,
  danger: CircleAlert,
  success: CheckCircle2,
  '!': CircleAlert,
  '❓': CircleHelp,
  'ℹ️': Info,
  '✅': CheckCircle2
}

const alertIconComponent = computed(() => {
  const key = String(alertState.value?.icon || '')
  return ALERT_ICON_COMPONENTS[key] || null
})

// 自动聚焦确认按钮
watch(alertState, async (val) => {
  if (val) {
    await nextTick()
    confirmBtnRef.value?.focus()
  }
})

function onConfirm() {
  const resolve = alertState.value?.resolve
  alertState.value = null
  resolve?.(true)
}

function onCancel() {
  if (alertState.value?.type === 'alert') { onConfirm(); return }
  const resolve = alertState.value?.resolve
  alertState.value = null
  resolve?.(false)
}

// ESC 键关闭
function onKeydown(e) {
  if (!alertState.value) return
  if (e.key === 'Escape') onCancel()
  if (e.key === 'Enter') onConfirm()
}
window.addEventListener('keydown', onKeydown)
</script>

<style scoped lang="scss" src="@/assets/styles/components/AppAlert.scss"></style>
