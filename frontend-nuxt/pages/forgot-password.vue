<template>
  <section class="mx-auto max-w-xl">
    <div class="card space-y-5">
      <header class="space-y-1 text-center">
        <h1 class="text-2xl font-bold">找回密码</h1>
        <p class="text-sm text-[var(--color-text-secondary)]">
          {{ step === 1 ? '输入邮箱发送验证码' : '输入验证码并设置新密码' }}
        </p>
      </header>

      <div class="grid grid-cols-[auto_1fr_auto] items-center gap-2 text-xs">
        <div class="rounded-full px-2 py-1 text-center" :class="step >= 1 ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100'">1</div>
        <div class="h-px bg-[var(--color-border)]"></div>
        <div class="rounded-full px-2 py-1 text-center" :class="step >= 2 ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100'">2</div>
      </div>

      <p v-if="infoMessage" class="rounded-xl bg-sky-50 px-3 py-2 text-sm text-sky-700">{{ infoMessage }}</p>
      <p v-if="errorMessage" class="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{{ errorMessage }}</p>

      <form v-if="step === 1" class="space-y-4" @submit.prevent="handleSendCode">
        <div class="space-y-1">
          <label class="text-sm font-medium">注册邮箱</label>
          <input v-model.trim="email" class="input" type="email" required />
        </div>
        <button class="btn btn-primary w-full px-4 py-2" :disabled="loading || countdown > 0" type="submit">
          {{ loading ? '发送中...' : countdown > 0 ? `${countdown}s 后可重发` : '发送验证码' }}
        </button>
      </form>

      <form v-else class="space-y-4" @submit.prevent="handleResetPassword">
        <div class="space-y-1">
          <label class="text-sm font-medium">邮箱</label>
          <input :value="email" class="input opacity-70" type="email" disabled />
        </div>
        <div class="space-y-1">
          <label class="text-sm font-medium">验证码</label>
          <div class="grid grid-cols-[1fr_auto] gap-2">
            <input v-model.trim="code" class="input" maxlength="6" required />
            <button class="btn px-3 py-2 text-xs" type="button" :disabled="loading || countdown > 0" @click="handleSendCode">
              {{ countdown > 0 ? `${countdown}s` : '重发' }}
            </button>
          </div>
        </div>
        <div class="space-y-1">
          <label class="text-sm font-medium">新密码</label>
          <input v-model="newPassword" class="input" :type="showPassword ? 'text' : 'password'" required />
        </div>
        <div class="space-y-1">
          <label class="text-sm font-medium">确认新密码</label>
          <input v-model="confirmPassword" class="input" :type="showPassword ? 'text' : 'password'" required />
        </div>
        <div class="flex gap-2">
          <button class="btn btn-primary flex-1 px-4 py-2" :disabled="loading" type="submit">
            {{ loading ? '提交中...' : '重置密码' }}
          </button>
          <button class="btn px-4 py-2" type="button" @click="showPassword = !showPassword">
            {{ showPassword ? '隐藏' : '显示' }}
          </button>
        </div>
      </form>

      <NuxtLink to="/login" class="text-sm text-[var(--color-text-secondary)] underline">返回登录</NuxtLink>
    </div>
  </section>
</template>

<script setup lang="ts">
import { authRepository } from '~/repositories'

definePageMeta({ layout: 'auth', middleware: ['guest'] })
useHead({ title: '找回密码 - Mini Note' })

const { getErrorMessage } = useApiMessage()

const step = ref(1)
const loading = ref(false)
const errorMessage = ref('')
const infoMessage = ref('')
const countdown = ref(0)
const showPassword = ref(false)

const email = ref('')
const code = ref('')
const newPassword = ref('')
const confirmPassword = ref('')

let countdownTimer: ReturnType<typeof setInterval> | null = null

function startCountdown() {
  countdown.value = 60
  if (countdownTimer) clearInterval(countdownTimer)
  countdownTimer = setInterval(() => {
    countdown.value -= 1
    if (countdown.value <= 0 && countdownTimer) {
      clearInterval(countdownTimer)
      countdownTimer = null
      countdown.value = 0
    }
  }, 1000)
}

function clearMessages() {
  errorMessage.value = ''
  infoMessage.value = ''
}

async function handleSendCode() {
  clearMessages()
  if (!email.value.trim()) {
    errorMessage.value = '请输入邮箱'
    return
  }
  loading.value = true
  try {
    const res = await authRepository.forgotPassword(email.value.trim()) as { success?: boolean; message?: string }
    if (res?.success) {
      infoMessage.value = res.message || '验证码已发送，请查收邮箱'
      step.value = 2
      startCountdown()
    }
  } catch (error) {
    errorMessage.value = getErrorMessage(error, '发送失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

async function handleResetPassword() {
  clearMessages()
  if (code.value.trim().length !== 6) {
    errorMessage.value = '请输入 6 位验证码'
    return
  }
  if (newPassword.value.length < 6) {
    errorMessage.value = '密码长度不能少于 6 位'
    return
  }
  if (newPassword.value !== confirmPassword.value) {
    errorMessage.value = '两次输入密码不一致'
    return
  }

  loading.value = true
  try {
    const res = await authRepository.resetPassword({
      email: email.value.trim(),
      code: code.value.trim(),
      newPassword: newPassword.value
    }) as { success?: boolean; message?: string }

    if (res?.success) {
      await navigateTo('/login')
    }
  } catch (error) {
    errorMessage.value = getErrorMessage(error, '重置失败，请检查验证码')
  } finally {
    loading.value = false
  }
}

onUnmounted(() => {
  if (countdownTimer) clearInterval(countdownTimer)
})
</script>
