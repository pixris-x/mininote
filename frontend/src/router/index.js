import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    redirect: '/notes'
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/LoginView.vue'),
    meta: { guest: true, title: '登录 - MiniList' }
  },
  {
    path: '/forgot-password',
    name: 'ForgotPassword',
    component: () => import('@/views/ForgotPasswordView.vue'),
    meta: { guest: true, title: '找回密码 - MiniList' }
  },
  {
    path: '/notes',
    name: 'Notes',
    component: () => import('@/views/NotesView.vue'),
    meta: { requiresAuth: true, title: '我的记事' }
  },
  {
    path: '/notes/:id',
    name: 'NoteDetail',
    component: () => import('@/views/NoteDetailView.vue'),
    meta: { requiresAuth: true, title: '记事详情' }
  },
  {
    path: '/calendar',
    name: 'Calendar',
    component: () => import('@/views/CalendarView.vue'),
    meta: { requiresAuth: true, title: '日历记事' }
  },
  {
    path: '/profile',
    name: 'Profile',
    component: () => import('@/views/ProfileView.vue'),
    meta: { requiresAuth: true, title: '个人主页' }
  },
  {
    path: '/expense',
    name: 'Expense',
    component: () => import('@/views/ExpenseView.vue'),
    meta: { requiresAuth: true, title: '记账本' }
  },
  {
    path: '/plans',
    name: 'Plans',
    component: () => import('@/views/PlanView.vue'),
    meta: { requiresAuth: true, title: '我的计划 - MiniList' }
  },
  {
    path: '/admin',
    name: 'Admin',
    component: () => import('@/views/AdminView.vue'),
    meta: { requiresAuth: true, requiresAdmin: true, title: '管理面板 - Mini List' }
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/notes'
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition
    return { top: 0 }
  }
})

// 路由守卫
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('minilist_token')
  const isAuthenticated = !!token

  // 更新页面标题
  document.title = to.meta.title || 'MiniList 🌸'

  if (to.meta.requiresAuth && !isAuthenticated) {
    next({ name: 'Login', query: { redirect: to.fullPath } })
  } else if (to.meta.guest && isAuthenticated) {
    next({ name: 'Notes' })
  } else if (to.meta.requiresAdmin) {
    // 从 localStorage 快速判断（详细鉴权由后端 API 保障）
    const user = JSON.parse(localStorage.getItem('minilist_user') || 'null')
    if (!user?.is_admin) {
      next({ name: 'Notes' })
    } else {
      next()
    }
  } else {
    next()
  }
})

export default router
