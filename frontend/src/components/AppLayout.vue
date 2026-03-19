<template>
  <div class="layout" :class="[`theme-${userStore.user?.theme || 'pink'}`, { 'sidebar-collapsed': collapsed }]">
    <!-- 桌面侧边栏 -->
    <aside class="sidebar" :class="{ collapsed }">
      <div class="sidebar-logo">
        <Flower2Icon class="logo-icon" :size="26" />
        <span class="logo-text">Mini Note</span>
      </div>

      <nav class="sidebar-nav">
        <router-link v-for="item in navItems" :key="item.name" :to="item.path" class="nav-item"
          :class="{ active: $route.path === item.path }" :title="collapsed ? item.label : ''">
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
    <nav class="bottom-nav">
      <router-link v-for="item in navItems" :key="item.name" :to="item.path" class="bottom-nav-item"
        :class="{ active: $route.path === item.path }">
        <component :is="item.icon" class="nav-icon" :size="22" />
        <span class="nav-label">{{ item.label }}</span>
      </router-link>
    </nav>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useUserStore } from '@/stores/user'
import { useRouter } from 'vue-router'
import { toast } from '@/utils/toast'
import {
  CalendarDays as CalendarDaysIcon,
  ChevronsLeft as ChevronsLeftIcon,
  ChevronsRight as ChevronsRightIcon,
  FileText as FileTextIcon,
  Flower2 as Flower2Icon,
  ListTodo as ListTodoIcon,
  LogOut as LogOutIcon,
  UserRound as UserRoundIcon,
  Wallet as WalletIcon
} from 'lucide-vue-next'

const userStore = useUserStore()
const router = useRouter()

const collapsed = ref(localStorage.getItem('sidebar-collapsed') === 'true')

function toggleCollapse() {
  collapsed.value = !collapsed.value
  localStorage.setItem('sidebar-collapsed', collapsed.value)
}

const navItems = computed(() => {
  const items = [
    { name: 'Notes', path: '/notes', icon: FileTextIcon, label: '记事' },
    { name: 'Plans', path: '/plans', icon: ListTodoIcon, label: '计划' },
    { name: 'Calendar', path: '/calendar', icon: CalendarDaysIcon, label: '日历' },
    { name: 'Expense', path: '/expense', icon: WalletIcon, label: '记账' },
    { name: 'Profile', path: '/profile', icon: UserRoundIcon, label: '我的' }
  ]
  return items
})

function handleLogout() {
  userStore.logout()
  toast.success('已安全退出')
  router.push('/login')
}
</script>

<style scoped>
.layout {
  display: flex;
  min-height: 100vh;
  background: var(--color-bg);
  overflow-x: hidden;
}

/* ===== 侧边栏 ===== */
.sidebar {
  display: none;
  width: 240px;
  min-height: 100vh;
  background: var(--color-surface);
  box-shadow: var(--shadow-sm);
  padding: 24px 16px;
  flex-direction: column;
  position: fixed;
  left: 0;
  top: 0;
  bottom: 0;
  z-index: 100;
  transition: width 0.25s ease;
  overflow: hidden;
}

.sidebar.collapsed {
  width: 68px;
  padding: 24px 8px;
}

@media (min-width: 768px) {
  .sidebar {
    display: flex;
  }

  .main-content {
    margin-left: 240px;
    transition: margin-left 0.25s ease;
  }

  .sidebar-collapsed .main-content {
    margin-left: 68px;
  }
}

.sidebar-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px 24px;
  overflow: hidden;
  white-space: nowrap;
}

.collapsed .sidebar-logo {
  justify-content: center;
  padding: 8px 0 24px;
  gap: 0;
}

.logo-icon {
  color: var(--theme-primary-dark);
  flex-shrink: 0;
}

.logo-text {
  font-size: 22px;
  font-weight: 800;
  color: var(--theme-primary-dark);
  letter-spacing: -0.5px;
  transition: opacity 0.2s, width 0.25s;
}

.collapsed .logo-text {
  opacity: 0;
  width: 0;
  overflow: hidden;
}

.sidebar-nav {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: var(--radius-md);
  text-decoration: none;
  color: var(--color-text-secondary);
  font-size: 15px;
  font-weight: 500;
  transition: all var(--transition);
  white-space: nowrap;
  overflow: hidden;
}

.collapsed .nav-item {
  padding: 12px 0;
  justify-content: center;
  gap: 0;
}

.nav-item:hover {
  background: var(--theme-primary-light);
  color: var(--theme-primary-dark);
}

.nav-item.active {
  background: var(--theme-primary-light);
  color: var(--theme-primary-dark);
  font-weight: 700;
}

.nav-item.active .nav-icon {
  filter: none;
}

.nav-icon {
  width: 24px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.nav-label {
  transition: opacity 0.2s;
}

.collapsed .nav-label {
  display: none;
}

.sidebar-user {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 12px;
  border-top: 1px solid var(--color-border);
  margin-top: 16px;
  overflow: hidden;
  white-space: nowrap;
}

.collapsed .sidebar-user {
  justify-content: center;
  padding: 12px 4px;
}

.collapsed .user-info,
.collapsed .sidebar-user .btn {
  display: none;
}

.user-info {
  flex: 1;
  min-width: 0;
}

.user-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-sub {
  font-size: 12px;
  color: var(--color-text-secondary);
}

/* ===== 主内容区 ===== */
.main-content {
  flex: 1;
  min-height: 100vh;
  min-width: 0;
  overflow-x: hidden;
}

/* 折叠按鈕 */
.collapse-btn {
  display: none;
}

@media (min-width: 768px) {
  .collapse-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    position: fixed;
    left: calc(240px - 14px);
    top: 50%;
    transform: translateY(-50%);
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    box-shadow: var(--shadow-sm);
    cursor: pointer;
    color: var(--color-text-secondary);
    transition: left 0.25s ease, background 0.2s, color 0.2s, box-shadow 0.2s, transform 0.2s;
    z-index: 200;
  }

  .collapse-btn.collapsed {
    left: calc(68px - 14px);
  }

  .collapse-btn:hover {
    background: var(--theme-primary-light);
    color: var(--theme-primary-dark);
    border-color: var(--theme-primary-dark);
    box-shadow: var(--shadow-md);
    transform: translateY(-50%) scale(1.15);
  }
}

/* ===== 底部导航（移动端） ===== */
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 72px;
  background: var(--color-surface);
  box-shadow: 0 -4px 16px var(--color-shadow);
  display: flex;
  align-items: flex-end;
  padding-bottom: 8px;
  z-index: 100;
  border-top: 1px solid var(--color-border);
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
}

@media (min-width: 768px) {
  .bottom-nav {
    display: none;
  }
}

.bottom-nav-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  text-decoration: none;
  color: var(--color-text-secondary);
  font-size: 10px;
  font-weight: 500;
  padding: 8px;
  transition: color 0.3s, transform 0.3s;
}

.bottom-nav-item .nav-icon {
  width: 22px;
  height: 22px;
  transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}

.bottom-nav-item.active {
  color: var(--theme-primary-dark);
}

.bottom-nav-item.active .nav-icon {
  transform: translateY(-5px) scale(1.22);
}
</style>
