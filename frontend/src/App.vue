<template>
  <div id="app-root">
    <!-- Toast 通知 -->
    <div class="toast-container">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        :class="['toast', `toast-${toast.type}`]"
      >
        <component :is="toastIcon(toast.type)" class="toast-icon" :size="16" />
        {{ toast.message }}
      </div>
    </div>

    <!-- 全局 Alert/Confirm 弹窗 -->
    <AppAlert />

    <!-- 路由视图 -->
    <router-view />
  </div>
</template>

<script setup>
import AppAlert from '@/components/AppAlert.vue'
import { toasts } from '@/utils/toast'
import { CheckCircle2, CircleAlert, MessageCircle } from 'lucide-vue-next'

function toastIcon(type) {
  const icons = { success: CheckCircle2, error: CircleAlert, info: MessageCircle }
  return icons[type] || MessageCircle
}
</script>

<style lang="scss" src="@/assets/styles/App.scss"></style>
