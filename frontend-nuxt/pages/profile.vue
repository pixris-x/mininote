<template>
  <div class="space-y-4">
    <section class="card space-y-3">
      <h1 class="text-xl font-bold">个人中心</h1>

      <p v-if="errorMessage" class="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{{ errorMessage }}</p>
      <p v-if="infoMessage" class="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{{ infoMessage }}</p>

      <div class="grid gap-2 md:grid-cols-2">
        <div class="space-y-1">
          <label class="text-sm font-medium">用户名</label>
          <input :value="profile.username" class="input opacity-70" type="text" disabled />
        </div>
        <div class="space-y-1">
          <label class="text-sm font-medium">邮箱</label>
          <input :value="profile.email" class="input opacity-70" type="text" disabled />
        </div>
      </div>

      <div class="space-y-1">
        <label class="text-sm font-medium">昵称</label>
        <input v-model.trim="profile.nickname" class="input" type="text" />
      </div>

      <div class="space-y-1">
        <label class="text-sm font-medium">主题</label>
        <select v-model="profile.theme" class="input">
          <option value="pink">pink</option>
          <option value="mint">mint</option>
          <option value="lavender">lavender</option>
          <option value="peach">peach</option>
          <option value="sky">sky</option>
          <option value="lemon">lemon</option>
        </select>
      </div>

      <div class="space-y-1">
        <label class="text-sm font-medium">简介</label>
        <textarea v-model="profile.bio" class="input min-h-24"></textarea>
      </div>

      <div class="flex flex-wrap gap-2">
        <button class="btn btn-primary px-4 py-2 text-sm" :disabled="loading" type="button" @click="saveProfile">
          {{ loading ? '保存中...' : '保存资料' }}
        </button>
        <button class="btn px-4 py-2 text-sm text-rose-600" type="button" @click="logout">退出登录</button>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { authRepository, userRepository } from '~/repositories'
import { clearSessionStorage } from '~/utils/session'

definePageMeta({ middleware: ['auth'] })
useHead({ title: '个人主页' })

type Profile = {
  username?: string
  email?: string
  nickname?: string
  theme?: string
  bio?: string
}

const { getErrorMessage } = useApiMessage()
const loading = ref(false)
const errorMessage = ref('')
const infoMessage = ref('')

const profile = reactive<Required<Profile>>({
  username: '',
  email: '',
  nickname: '',
  theme: 'pink',
  bio: ''
})

function clearMessages() {
  errorMessage.value = ''
  infoMessage.value = ''
}

function applyTheme(theme: string) {
  if (!import.meta.client) return
  document.documentElement.setAttribute('data-theme', theme)
}

async function fetchProfile() {
  clearMessages()
  loading.value = true
  try {
    const res = await userRepository.getProfile() as { success?: boolean; data?: Profile }
    if (res?.success && res.data) {
      profile.username = res.data.username || ''
      profile.email = res.data.email || ''
      profile.nickname = res.data.nickname || ''
      profile.theme = res.data.theme || 'pink'
      profile.bio = res.data.bio || ''
      applyTheme(profile.theme)
    }
  } catch (error) {
    errorMessage.value = getErrorMessage(error, '加载个人资料失败')
  } finally {
    loading.value = false
  }
}

async function saveProfile() {
  clearMessages()
  loading.value = true
  try {
    const res = await userRepository.updateProfile({
      nickname: profile.nickname,
      theme: profile.theme,
      bio: profile.bio
    }) as { success?: boolean; message?: string; data?: Profile }
    if (res?.success) {
      infoMessage.value = res.message || '资料已更新'
      applyTheme(profile.theme)
      if (import.meta.client) {
        const current = JSON.parse(localStorage.getItem('minilist_user') || '{}')
        localStorage.setItem('minilist_user', JSON.stringify({ ...current, ...res.data }))
      }
    }
  } catch (error) {
    errorMessage.value = getErrorMessage(error, '保存失败')
  } finally {
    loading.value = false
  }
}

async function logout() {
  try {
    await authRepository.logout()
  } catch {}
  clearSessionStorage()
  await navigateTo('/login')
}

onMounted(fetchProfile)
</script>
