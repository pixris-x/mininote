import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi, pushApi, userApi } from '@/api'

export const useUserStore = defineStore('user', () => {
  const user = ref(JSON.parse(localStorage.getItem('minilist_user') || 'null'))
  const token = ref(localStorage.getItem('minilist_token') || '')
  const loading = ref(false)

  const isLoggedIn = computed(() => !!token.value)
  const avatarLabel = computed(() => {
    if (!user.value) return '?'
    return (user.value.nickname || user.value.username || '?').charAt(0).toUpperCase()
  })

  function applyTheme(theme) {
    if (theme) {
      document.documentElement.setAttribute('data-theme', theme)
    }
  }

  function applyAuthData(data) {
    if (!data?.token || !data?.user) return
    user.value = data.user
    token.value = data.token
    localStorage.setItem('minilist_token', data.token)
    localStorage.setItem('minilist_user', JSON.stringify(data.user))
    applyTheme(data.user.theme)
  }

  async function login(credentials) {
    loading.value = true
    try {
      const res = await authApi.login(credentials)
      if (res.success && res.data?.token) applyAuthData(res.data)
      return res
    } finally {
      loading.value = false
    }
  }

  async function verifyLogin2FA(payload) {
    loading.value = true
    try {
      const res = await authApi.verifyLogin2FA(payload)
      if (res.success && res.data?.token) applyAuthData(res.data)
      return res
    } finally {
      loading.value = false
    }
  }

  async function register(data) {
    loading.value = true
    try {
      const res = await authApi.register(data)
      if (res.success && res.data?.token) applyAuthData(res.data)
      return res
    } finally {
      loading.value = false
    }
  }

  function logout() {
    const authToken = token.value || localStorage.getItem('minilist_token') || ''
    if (authToken) {
      authApi.logout().catch(() => {})
    }
    user.value = null
    token.value = ''
    localStorage.removeItem('minilist_token')
    localStorage.removeItem('minilist_user')
    document.documentElement.removeAttribute('data-theme')
    // 退出登录时取消 Push 订阅，防止通知发到别人手上
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      navigator.serviceWorker.ready.then(async reg => {
        const sub = await reg.pushManager.getSubscription()
        if (sub) {
          try {
            await pushApi.unsubscribe(sub.endpoint, {
              headers: { Authorization: `Bearer ${authToken}` }
            })
          } catch {}
          await sub.unsubscribe()
        }
      }).catch(() => {})
    }
  }

  async function fetchProfile() {
    try {
      const res = await userApi.getProfile()
      if (res.success) {
        user.value = res.data
        localStorage.setItem('minilist_user', JSON.stringify(res.data))
        applyTheme(res.data.theme)
      }
    } catch (err) {
      console.error('获取用户信息失败:', err)
    }
  }

  async function updateProfile(data) {
    const res = await userApi.updateProfile(data)
    if (res.success) {
      user.value = res.data
      localStorage.setItem('minilist_user', JSON.stringify(res.data))
      applyTheme(res.data.theme)
    }
    return res
  }

  // 初始化主题
  if (user.value?.theme) {
    applyTheme(user.value.theme)
  }

  return {
    user,
    token,
    loading,
    isLoggedIn,
    avatarLabel,
    login,
    verifyLogin2FA,
    register,
    logout,
    fetchProfile,
    updateProfile
  }
})

