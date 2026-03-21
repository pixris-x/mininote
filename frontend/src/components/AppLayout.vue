<template>
  <div class="layout" :class="[`theme-${userStore.user?.theme || 'pink'}`, { 'sidebar-collapsed': collapsed }]">
    <!-- 桌面侧边栏 -->
    <aside class="sidebar" :class="{ collapsed }">
      <div class="sidebar-logo">
        <Flower2Icon class="logo-icon" :size="26" />
        <span class="logo-text">Mini Note</span>
      </div>

      <nav class="sidebar-nav" :style="sidebarAnchorStyle" @mouseleave="hoveredSidebarIndex = -1">
        <router-link v-for="(item, index) in navItems" :key="item.name" :to="item.path" class="nav-item"
          :class="{ active: isItemActive(item.path) }" :title="collapsed ? item.label : ''" @mouseenter="hoveredSidebarIndex = index"
          @focus="hoveredSidebarIndex = index">
          <component :is="item.icon" class="nav-icon" :size="20" />
          <span class="nav-label">{{ item.label }}</span>
        </router-link>
      </nav>

      <div class="sidebar-user">
        <div class="avatar" :style="{ background: userStore.user?.avatar_color }">
          {{ userStore.avatarLabel }}
        </div>
        <div class="user-info">
          <div class="user-name">{{ userStore.user?.nickname }}</div>
          <div class="user-sub">@{{ userStore.user?.username }}</div>
        </div>
        <button class="btn btn-ghost btn-icon" @click="handleLogout" title="退出登录">
          <LogOutIcon :size="18" />
        </button>
      </div>

      <!-- 折叠按鈕（移出 sidebar，避免 overflow:hidden 裁切） -->
    </aside>

    <!-- 折叠按鈕 -->
    <button class="collapse-btn" :class="{ collapsed }" @click="toggleCollapse" :title="collapsed ? '展开菜单' : '收起菜单'">
      <ChevronsLeftIcon v-if="!collapsed" :size="16" />
      <ChevronsRightIcon v-else :size="16" />
    </button>

    <!-- 主内容区 -->
    <main class="main-content page-with-nav">
      <slot />
    </main>

    <!-- 移动端底部导航 -->
    <nav class="bottom-nav" :style="bottomAnchorStyle" @mouseleave="hoveredBottomIndex = -1">
      <router-link v-for="(item, index) in navItems" :key="item.name" :to="item.path" class="bottom-nav-item"
        :class="{ active: isItemActive(item.path) }" @mouseenter="hoveredBottomIndex = index"
        @focus="hoveredBottomIndex = index">
        <component :is="item.icon" class="nav-icon" :size="22" />
        <span class="nav-label">{{ item.label }}</span>
      </router-link>
    </nav>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useUserStore } from '@/stores/user'
import { useRoute, useRouter } from 'vue-router'
import { toast } from '@/utils/toast'
import {
  CalendarDays as CalendarDaysIcon,
  ChevronsLeft as ChevronsLeftIcon,
  ChevronsRight as ChevronsRightIcon,
  FileText as FileTextIcon,
  Flower2 as Flower2Icon,
  ListTodo as ListTodoIcon,
  LogOut as LogOutIcon,
  Search as SearchIcon,
  UserRound as UserRoundIcon,
  Wallet as WalletIcon
} from 'lucide-vue-next'

const userStore = useUserStore()
const router = useRouter()
const route = useRoute()

const collapsed = ref(localStorage.getItem('sidebar-collapsed') === 'true')
const hoveredSidebarIndex = ref(-1)
const hoveredBottomIndex = ref(-1)

function toggleCollapse() {
  collapsed.value = !collapsed.value
  localStorage.setItem('sidebar-collapsed', collapsed.value)
}

const navItems = computed(() => {
  const items = [
    { name: 'Notes', path: '/notes', icon: FileTextIcon, label: '记事' },
    { name: 'Search', path: '/search', icon: SearchIcon, label: '搜索' },
    { name: 'Plans', path: '/plans', icon: ListTodoIcon, label: '计划' },
    { name: 'Calendar', path: '/calendar', icon: CalendarDaysIcon, label: '日历' },
    { name: 'Expense', path: '/expense', icon: WalletIcon, label: '记账' },
    { name: 'Profile', path: '/profile', icon: UserRoundIcon, label: '我的' }
  ]
  return items
})

function isItemActive(itemPath) {
  return route.path === itemPath || route.path.startsWith(`${itemPath}/`)
}

const activeNavIndex = computed(() => navItems.value.findIndex(item => isItemActive(item.path)))

const sidebarAnchorStyle = computed(() => {
  const index = hoveredSidebarIndex.value >= 0 ? hoveredSidebarIndex.value : activeNavIndex.value
  return {
    '--anchor-index': index >= 0 ? index : 0,
    '--anchor-opacity': index >= 0 ? 1 : 0
  }
})

const bottomAnchorStyle = computed(() => {
  const index = hoveredBottomIndex.value >= 0 ? hoveredBottomIndex.value : activeNavIndex.value
  const count = Math.max(navItems.value.length, 1)
  return {
    '--bottom-count': count,
    '--bottom-anchor-left': `${(Math.max(index, 0) / count) * 100}%`,
    '--bottom-anchor-width': `${100 / count}%`,
    '--bottom-anchor-opacity': index >= 0 ? 1 : 0
  }
})

function handleLogout() {
  userStore.logout()
  toast.success('已安全退出')
  router.push('/login')
}
</script>

<style scoped lang="scss" src="@/assets/styles/components/AppLayout.scss"></style>

