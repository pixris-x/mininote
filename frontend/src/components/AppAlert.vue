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

<style scoped>
.app-alert-overlay {
  position: fixed;
  inset: 0;
  background: rgba(74, 63, 63, 0.35);
  backdrop-filter: blur(4px);
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.app-alert-box {
  background: var(--color-surface);
  border-radius: 20px;
  padding: 28px 24px 20px;
  width: 100%;
  max-width: 320px;
  box-shadow:
    0 20px 60px rgba(255, 133, 161, 0.2),
    0 4px 16px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 10px;
}

/* 危险变体：顶部红色细线装饰 */
.app-alert-box--danger {
  box-shadow:
    0 20px 60px rgba(255, 100, 120, 0.2),
    0 4px 16px rgba(0, 0, 0, 0.1);
  border-top: 3px solid #FF7B8A;
}

.app-alert-icon {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: #ffeaf0;
  color: var(--theme-primary-dark);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 1.4rem;
  line-height: 1;
  margin-bottom: 2px;
}

.app-alert-box--danger .app-alert-icon {
  background: #ffe9ec;
  color: #ff5a6e;
}

.app-alert-icon-svg {
  width: 24px;
  height: 24px;
}

.app-alert-title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-text);
}

.app-alert-message {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  line-height: 1.6;
  word-break: break-word;
}

/* 按钮组 */
.app-alert-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  width: 100%;
  margin-top: 6px;
}

.app-alert-actions--single {
  grid-template-columns: 1fr;
}

.app-alert-btn {
  padding: 10px 0;
  border-radius: 12px;
  font-size: 0.875rem;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: background 0.15s, transform 0.1s, box-shadow 0.15s;
}
.app-alert-btn:active { transform: scale(0.97); }

.app-alert-btn--cancel {
  background: var(--color-border);
  color: var(--color-text-secondary);
}
.app-alert-btn--cancel:hover { background: #e8d4da; }

/* 默认确认：粉色 */
.app-alert-btn--confirm.app-alert-btn--default {
  background: var(--theme-primary-dark);
  color: #fff;
  box-shadow: 0 4px 14px rgba(255, 133, 161, 0.4);
}
.app-alert-btn--confirm.app-alert-btn--default:hover {
  background: #ff6d8f;
  box-shadow: 0 6px 18px rgba(255, 133, 161, 0.5);
}

/* 危险确认：红色 */
.app-alert-btn--confirm.app-alert-btn--danger {
  background: #FF7B8A;
  color: #fff;
  box-shadow: 0 4px 14px rgba(255, 100, 120, 0.35);
}
.app-alert-btn--confirm.app-alert-btn--danger:hover {
  background: #ff5a6e;
  box-shadow: 0 6px 18px rgba(255, 100, 120, 0.45);
}

/* ── 动画 ── */
.alert-fade-enter-active,
.alert-fade-leave-active { transition: opacity 0.2s; }
.alert-fade-enter-from,
.alert-fade-leave-to { opacity: 0; }

.alert-pop-enter-active { transition: opacity 0.2s, transform 0.2s; }
.alert-pop-leave-active { transition: opacity 0.15s, transform 0.15s; }
.alert-pop-enter-from { opacity: 0; transform: scale(0.88) translateY(12px); }
.alert-pop-leave-to   { opacity: 0; transform: scale(0.95); }
</style>
