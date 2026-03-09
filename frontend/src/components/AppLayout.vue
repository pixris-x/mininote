<template>
  <div class="layout" :class="`theme-${userStore.user?.theme || 'pink'}`">
    <!-- 桌面侧边栏 -->
    <aside class="sidebar">
      <div class="sidebar-logo">
        <span class="logo-icon">🌸</span>
        <span class="logo-text">Mini List</span>
      </div>

      <nav class="sidebar-nav">
        <router-link
          v-for="item in navItems"
          :key="item.name"
          :to="item.path"
          class="nav-item"
          :class="{ active: $route.path === item.path }"
        >
          <span class="nav-icon">{{ item.icon }}</span>
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
          🚪
        </button>
      </div>
    </aside>

    <!-- 主内容区 -->
    <main class="main-content page-with-nav">
      <slot />
    </main>

    <!-- 移动端底部导航 -->
    <nav class="bottom-nav">
      <router-link
        v-for="item in navItems"
        :key="item.name"
        :to="item.path"
        class="bottom-nav-item"
        :class="{ active: $route.path === item.path }"
      >
        <span class="nav-icon">{{ item.icon }}</span>
        <span class="nav-label">{{ item.label }}</span>
      </router-link>
    </nav>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useUserStore } from '@/stores/user'
import { useRouter } from 'vue-router'
import { toast } from '@/utils/toast'

const userStore = useUserStore()
const router = useRouter()

const navItems = computed(() => {
  const items = [
    { name: 'Notes', path: '/notes', icon: '📝', label: '记事' },
    { name: 'Calendar', path: '/calendar', icon: '📅', label: '日历' },
    { name: 'Expense', path: '/expense', icon: '💰', label: '记账' },
    { name: 'Profile', path: '/profile', icon: '🌸', label: '我的' }
  ]
  if (userStore.user?.is_admin) {
    items.push({ name: 'Admin', path: '/admin', icon: '👑', label: '管理' })
  }
  return items
})

function handleLogout() {
  userStore.logout()
  toast.success('已安全退出 👋')
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
}

@media (min-width: 768px) {
  .sidebar {
    display: flex;
  }
}

.sidebar-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px 24px;
}

.logo-icon {
  font-size: 28px;
}

.logo-text {
  font-size: 22px;
  font-weight: 800;
  color: var(--theme-primary-dark);
  letter-spacing: -0.5px;
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
  font-size: 20px;
  width: 24px;
  text-align: center;
}

.sidebar-user {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 12px;
  border-top: 1px solid var(--color-border);
  margin-top: 16px;
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

/* ===== 底部导航（移动端） ===== */
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 64px;
  background: var(--color-surface);
  box-shadow: 0 -4px 16px var(--color-shadow);
  display: flex;
  align-items: center;
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
  transition: color var(--transition);
}

.bottom-nav-item .nav-icon {
  font-size: 22px;
  width: auto;
  display: block;
  transition: transform var(--transition);
}

.bottom-nav-item.active {
  color: var(--theme-primary-dark);
}

.bottom-nav-item.active .nav-icon {
  transform: scale(1.15);
}
</style>
