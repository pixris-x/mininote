import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/LoginView.vue'),
    meta: { guest: true, title: '登录 - Mini Note' }
  },
  {
    path: '/forgot-password',
    name: 'ForgotPassword',
    component: () => import('@/views/ForgotPasswordView.vue'),
    meta: { guest: true, title: '找回密码 - Mini Note' }
  },
  {
    path: '/',
    component: () => import('@/layouts/AppShell.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        redirect: '/notes'
      },
      {
        path: 'notes',
        name: 'Notes',
        component: () => import('@/views/NotesView.vue'),
        meta: { title: '我的记事' }
      },
      {
        path: 'notes/:id',
        name: 'NoteDetail',
        component: () => import('@/views/NoteDetailView.vue'),
        meta: { title: '记事详情' }
      },
      {
        path: 'search',
        name: 'GlobalSearch',
        component: () => import('@/views/GlobalSearchView.vue'),
        meta: { title: '全局搜索 - Mini Note' }
      },
      {
        path: 'notifications',
        name: 'Notifications',
        component: () => import('@/views/NotificationView.vue'),
        meta: { title: '通知中心 - Mini Note' }
      },
      {
        path: 'calendar',
        name: 'Calendar',
        component: () => import('@/views/CalendarView.vue'),
        meta: { title: '日历记事' }
      },
      {
        path: 'profile',
        name: 'Profile',
        component: () => import('@/views/ProfileView.vue'),
        meta: { title: '个人主页' }
      },
      {
        path: 'expense',
        name: 'Expense',
        component: () => import('@/views/ExpenseView.vue'),
        meta: { title: '记账本' }
      },
      {
        path: 'plans',
        name: 'Plans',
        component: () => import('@/views/PlanView.vue'),
        meta: { title: '我的计划 - Mini Note' }
      }
    ]
  },
  {
    path: '/admin',
    name: 'Admin',
    component: () => import('@/views/AdminView.vue'),
    meta: { requiresAuth: true, requiresAdmin: true, title: '管理面板 - Mini Note' }
  },
  {
    path: '/share/:token',
    name: 'ShareView',
    component: () => import('@/views/ShareView.vue'),
    meta: { title: '计划分享 - Mini Note' }
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

router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('minilist_token')
  const isAuthenticated = !!token

  document.title = to.meta.title || 'Mini Note'

  if (to.meta.requiresAuth && !isAuthenticated) {
    next({ name: 'Login', query: { redirect: to.fullPath } })
  } else if (to.meta.guest && isAuthenticated) {
    next({ name: 'Notes' })
  } else if (to.meta.requiresAdmin) {
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
