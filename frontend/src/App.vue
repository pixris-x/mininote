<template>
  <div id="app-root">
    <!-- Toast 通知 -->
    <div class="toast-container">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        :class="['toast', `toast-${toast.type}`]"
      >
        <span>{{ toastIcon(toast.type) }}</span>
        {{ toast.message }}
      </div>
    </div>

    <!-- 全局 Alert/Confirm 弹窗 -->
    <AppAlert />

    <!-- 路由视图 -->
    <router-view v-slot="{ Component, route }">
      <transition name="page-fade" mode="out-in">
        <component :is="Component" :key="route.path" />
      </transition>
    </router-view>
  </div>
</template>

<script setup>
import AppAlert from '@/components/AppAlert.vue'
import { toasts } from '@/utils/toast'

function toastIcon(type) {
  const icons = { success: '✅', error: '❌', info: '💬' }
  return icons[type] || '💬'
}
</script>

<style>
#app-root {
  min-height: 100vh;
}
</style>
