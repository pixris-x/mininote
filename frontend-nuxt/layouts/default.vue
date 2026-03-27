<template>
  <div class="layout" :class="{ 'sidebar-collapsed': collapsed }">
    <aside class="sidebar" :class="{ collapsed }">
      <div class="sidebar-logo">
        <Flower2Icon class="logo-icon" :size="26" />
        <span class="logo-text">Mini Note</span>
      </div>

      <nav class="sidebar-nav" :style="sidebarAnchorStyle" @mouseleave="hoveredSidebarIndex = -1">
        <NuxtLink
          v-for="(item, index) in navItems"
          :key="item.path"
          :to="item.path"
          class="nav-item"
          :class="{ active: isActive(item.path) }"
          :title="collapsed ? item.label : ''"
          @mouseenter="hoveredSidebarIndex = index"
          @focus="hoveredSidebarIndex = index"
        >
          <component :is="item.icon" class="nav-icon" :size="20" />
          <span class="nav-label">{{ item.label }}</span>
          <span v-if="item.path === '/notifications' && unreadTotal > 0" class="nav-badge">
            {{ unreadBadgeText }}
          </span>
        </NuxtLink>
      </nav>

      <div class="sidebar-user">
        <div class="avatar" :style="{ background: avatarColor }">
          {{ avatarLabel }}
        </div>
        <div class="user-info">
          <div class="user-name">{{ nickname }}</div>
          <div class="user-sub">@{{ username }}</div>
        </div>
        <button class="btn btn-ghost btn-icon" type="button" @click="handleLogout" title="退出登录">
          <LogOutIcon :size="18" />
        </button>
      </div>
    </aside>

    <button class="collapse-btn" :class="{ collapsed }" type="button" @click="toggleCollapse" :title="collapsed ? '展开菜单' : '收起菜单'">
      <ChevronsLeftIcon v-if="!collapsed" :size="16" />
      <ChevronsRightIcon v-else :size="16" />
    </button>

    <main class="main-content page-with-nav">
      <slot />
    </main>

    <nav class="bottom-nav" :style="bottomAnchorStyle" @mouseleave="hoveredBottomIndex = -1">
      <NuxtLink
        v-for="(item, index) in navItems"
        :key="`m-${item.path}`"
        :to="item.path"
        class="bottom-nav-item"
        :class="{ active: isActive(item.path) }"
        @mouseenter="hoveredBottomIndex = index"
        @focus="hoveredBottomIndex = index"
      >
        <component :is="item.icon" class="nav-icon" :size="22" />
        <span class="nav-label">{{ item.label }}</span>
        <span v-if="item.path === '/notifications' && unreadTotal > 0" class="bottom-badge">
          {{ unreadBadgeText }}
        </span>
      </NuxtLink>
    </nav>
  </div>
</template>

<script setup lang="ts">
import {
  Bell as BellIcon,
  CalendarDays as CalendarDaysIcon,
  ChevronsLeft as ChevronsLeftIcon,
  ChevronsRight as ChevronsRightIcon,
  FileText as FileTextIcon,
  Flower2 as Flower2Icon,
  ListTodo as ListTodoIcon,
  LogOut as LogOutIcon,
  Search as SearchIcon,
  Shield as ShieldIcon,
  UserRound as UserRoundIcon,
  Wallet as WalletIcon
} from 'lucide-vue-next'
import type { Component } from 'vue'
import { authRepository, notificationsRepository } from '~/repositories'
import { clearSessionStorage, readSessionUser } from '~/utils/session'

type SessionUser = {
  is_admin?: boolean
  username?: string
  nickname?: string
  avatar_color?: string
  theme?: string
}

type NavItem = {
  path: string
  label: string
  icon: Component
}

const route = useRoute()

const collapsed = ref(false)
const hoveredSidebarIndex = ref(-1)
const hoveredBottomIndex = ref(-1)
const unreadTotal = ref(0)

const user = ref<SessionUser | null>(null)

if (import.meta.client) {
  user.value = readSessionUser<SessionUser>()
  collapsed.value = localStorage.getItem('sidebar-collapsed') === 'true'
  const theme = user.value?.theme || 'pink'
  document.documentElement.setAttribute('data-theme', theme)
}

const nickname = computed(() => user.value?.nickname || user.value?.username || '用户')
const username = computed(() => user.value?.username || 'user')
const avatarLabel = computed(() => (nickname.value || 'U').slice(0, 1).toUpperCase())
const avatarColor = computed(() => user.value?.avatar_color || 'var(--theme-primary-dark)')
const isAdmin = computed(() => Boolean(user.value?.is_admin))

const baseNavItems = computed<NavItem[]>(() => [
  { path: '/notes', label: '记事', icon: FileTextIcon },
  { path: '/search', label: '搜索', icon: SearchIcon },
  { path: '/notifications', label: '通知', icon: BellIcon },
  { path: '/plans', label: '计划', icon: ListTodoIcon },
  { path: '/calendar', label: '日历', icon: CalendarDaysIcon },
  { path: '/expense', label: '记账', icon: WalletIcon },
  { path: '/profile', label: '我的', icon: UserRoundIcon }
])

const navItems = computed<NavItem[]>(() => {
  if (!isAdmin.value) return baseNavItems.value
  return [...baseNavItems.value, { path: '/admin', label: '管理', icon: ShieldIcon }]
})

const activeNavIndex = computed(() => navItems.value.findIndex((item) => isActive(item.path)))
const unreadBadgeText = computed(() => (unreadTotal.value > 99 ? '99+' : String(unreadTotal.value)))

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

function isActive(path: string) {
  return route.path === path || route.path.startsWith(`${path}/`)
}

function toggleCollapse() {
  collapsed.value = !collapsed.value
  if (import.meta.client) {
    localStorage.setItem('sidebar-collapsed', String(collapsed.value))
  }
}

async function refreshNotificationSummary() {
  if (!import.meta.client) return
  try {
    const res = await notificationsRepository.getSummary() as { success?: boolean; data?: { unread_total?: number } }
    if (res?.success) {
      unreadTotal.value = Number(res.data?.unread_total || 0)
    }
  } catch {
    unreadTotal.value = 0
  }
}

async function handleLogout() {
  try {
    await authRepository.logout()
  } catch {}
  clearSessionStorage()
  await navigateTo('/login')
}

onMounted(() => {
  refreshNotificationSummary()
})

watch(
  () => route.fullPath,
  () => {
    refreshNotificationSummary()
  }
)
</script>

<style scoped lang="scss" src="~/assets/styles/layout-default.scss"></style>
