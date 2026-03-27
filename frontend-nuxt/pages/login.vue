<template>
  <div class="login-page">
    <Flower2 class="deco deco-1" />
    <Sparkles class="deco deco-2" />
    <Leaf class="deco deco-3" />
    <Star class="deco deco-4" />

    <div class="login-card card">
      <div class="login-logo">
        <Flower2 class="logo-big" />
        <h1 class="logo-title">Mini Note</h1>
        <p class="logo-sub">记录每一个美好瞬间</p>
      </div>

      <div class="tab-group">
        <button class="tab-btn" :class="{ active: activeTab === 'login' }" type="button" @click="switchTab('login')">
          登录
        </button>
        <button class="tab-btn" :class="{ active: activeTab === 'register' }" type="button" @click="switchTab('register')">
          注册
        </button>
      </div>

      <div v-if="errorMessage" class="error-msg">
        <CircleAlert class="msg-icon" />
        <span>{{ errorMessage }}</span>
      </div>
      <div v-else-if="infoMessage" class="twofactor-hint">
        <ShieldCheck class="msg-icon" />
        <span>{{ infoMessage }}</span>
      </div>

      <form v-if="activeTab === 'login'" class="form" @submit.prevent="loginStep === 'password' ? handleLogin() : handleVerifyTwoFactor()">
        <template v-if="loginStep === 'password'">
          <div class="form-group">
            <label class="form-label">用户名 / 邮箱</label>
            <input
              v-model.trim="loginForm.username"
              type="text"
              class="input"
              placeholder="请输入用户名或邮箱"
              autocomplete="username"
              required
            />
          </div>

          <div class="form-group">
            <label class="form-label">密码</label>
            <div class="input-wrap">
              <input
                v-model="loginForm.password"
                :type="showPassword ? 'text' : 'password'"
                class="input"
                placeholder="请输入密码"
                autocomplete="current-password"
                required
              />
              <button type="button" class="show-pass" @click="showPassword = !showPassword">
                <EyeOff v-if="showPassword" class="pass-icon" />
                <Eye v-else class="pass-icon" />
              </button>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">验证码</label>
            <div class="captcha-row">
              <div class="captcha-box" title="点击刷新" @click="generateLoginCaptcha">
                <span class="captcha-num">{{ captcha.a }}</span>
                <span class="captcha-op">{{ captcha.op }}</span>
                <span class="captcha-num">{{ captcha.b }}</span>
                <span class="captcha-eq">=&nbsp;?</span>
              </div>
              <input
                v-model.trim="captchaInput"
                type="text"
                inputmode="numeric"
                class="input captcha-input"
                placeholder="计算结果"
                maxlength="4"
                autocomplete="off"
                required
              />
            </div>
          </div>

          <button type="submit" class="btn btn-primary w-full btn-lg" :disabled="loading">
            <span v-if="loading" class="loading-spinner" style="width:18px;height:18px;border-width:2px"></span>
            <span v-else class="btn-content btn-content-balanced">
              <LogIn class="btn-icon" />
              <span class="btn-text">登录</span>
              <span class="btn-icon-placeholder" aria-hidden="true"></span>
            </span>
          </button>

          <div style="text-align:right;margin-top:4px;">
            <NuxtLink to="/forgot-password" class="forgot-link">忘记密码？</NuxtLink>
          </div>
        </template>

        <template v-else>
          <div class="twofactor-hint">
            <ShieldCheck class="msg-icon" />
            <span>请输入发送到 {{ twoFactorState.email_hint || '你的邮箱' }} 的 6 位验证码</span>
          </div>
          <div class="form-group">
            <label class="form-label">二步验证码</label>
            <input
              v-model.trim="twoFactorState.code"
              type="text"
              inputmode="numeric"
              class="input"
              placeholder="请输入6位验证码"
              maxlength="6"
              autocomplete="one-time-code"
              required
            />
          </div>
          <button type="submit" class="btn btn-primary w-full btn-lg" :disabled="loading">
            <span v-if="loading" class="loading-spinner" style="width:18px;height:18px;border-width:2px"></span>
            <span v-else class="btn-content btn-content-balanced">
              <ShieldCheck class="btn-icon" />
              <span class="btn-text">验证并登录</span>
              <span class="btn-icon-placeholder" aria-hidden="true"></span>
            </span>
          </button>
          <div class="twofactor-actions">
            <button
              type="button"
              class="btn btn-outline btn-sm"
              :disabled="resendCountdown > 0 || resendLoading"
              @click="resendTwoFactorCode"
            >
              <span v-if="resendLoading" class="loading-spinner" style="width:12px;height:12px;border-width:2px"></span>
              <span v-else-if="resendCountdown > 0">{{ resendCountdown }}s 后可重发</span>
              <span v-else>重发验证码</span>
            </button>
            <button type="button" class="btn btn-ghost btn-sm" @click="backToPasswordStep">
              <ArrowLeft class="btn-icon" />
              返回
            </button>
          </div>
        </template>
      </form>

      <form v-else class="form" @submit.prevent="handleRegister">
        <div class="form-group">
          <label class="form-label">用户名 <span class="required">*</span></label>
          <input
            v-model.trim="registerForm.username"
            type="text"
            class="input"
            :class="{ 'input-error': fieldErrors.username }"
            placeholder="3-20位字母数字"
            autocomplete="username"
            required
            @input="fieldErrors.username = ''"
          />
          <p v-if="fieldErrors.username" class="field-error-msg">{{ fieldErrors.username }}</p>
        </div>

        <div class="form-group">
          <label class="form-label">昵称</label>
          <input v-model.trim="registerForm.nickname" type="text" class="input" placeholder="你的显示名称（选填）" />
        </div>

        <div class="form-group">
          <label class="form-label">邮箱 <span class="required">*</span></label>
          <div class="email-code-row">
            <input
              v-model.trim="registerForm.email"
              type="email"
              class="input"
              :class="{ 'input-error': fieldErrors.email }"
              placeholder="your@email.com"
              autocomplete="email"
              required
              @input="fieldErrors.email = ''"
            />
            <button type="button" class="btn-send-code" :disabled="codeCountdown > 0 || codeSending" @click="sendRegisterCode">
              <span v-if="codeSending" class="loading-spinner" style="width:12px;height:12px;border-width:2px"></span>
              <span v-else-if="codeCountdown > 0">重发 ({{ codeCountdown }}s)</span>
              <span v-else>发送验证码</span>
            </button>
          </div>
          <p v-if="fieldErrors.email" class="field-error-msg">{{ fieldErrors.email }}</p>
        </div>

        <div class="form-group">
          <label class="form-label">邮箱验证码 <span class="required">*</span></label>
          <input
            v-model.trim="registerForm.code"
            type="text"
            inputmode="numeric"
            class="input"
            :class="{ 'input-error': fieldErrors.code }"
            placeholder="请输入收到的6位验证码"
            maxlength="6"
            autocomplete="one-time-code"
            required
            @input="fieldErrors.code = ''"
          />
          <p v-if="fieldErrors.code" class="field-error-msg">{{ fieldErrors.code }}</p>
        </div>

        <div class="form-group">
          <label class="form-label">密码 <span class="required">*</span></label>
          <div class="input-wrap">
            <input
              v-model="registerForm.password"
              :type="showPassword ? 'text' : 'password'"
              class="input"
              placeholder="至少6位"
              autocomplete="new-password"
              required
            />
            <button type="button" class="show-pass" @click="showPassword = !showPassword">
              <EyeOff v-if="showPassword" class="pass-icon" />
              <Eye v-else class="pass-icon" />
            </button>
          </div>
        </div>

        <button type="submit" class="btn btn-primary w-full btn-lg" :disabled="loading">
          <span v-if="loading" class="loading-spinner" style="width:18px;height:18px;border-width:2px"></span>
          <span v-else class="btn-content">
            <UserPlus class="btn-icon" />
            创建账号
          </span>
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ArrowLeft, CircleAlert, Eye, EyeOff, Flower2, Leaf, LogIn, ShieldCheck, Sparkles, Star, UserPlus } from 'lucide-vue-next'
import { authRepository } from '~/repositories'
import { SESSION_TOKEN_KEY, SESSION_USER_KEY } from '~/utils/session'

definePageMeta({ layout: 'auth', middleware: ['guest'] })
useHead({ title: '登录 - Mini Note' })

type AuthData = { token?: string; user?: { theme?: string } } & Record<string, unknown>

const route = useRoute()
const { getErrorMessage } = useApiMessage()

const activeTab = ref<'login' | 'register'>('login')
const loading = ref(false)
const errorMessage = ref('')
const infoMessage = ref('')
const showPassword = ref(false)
const fieldErrors = reactive({
  username: '',
  email: '',
  code: ''
})

const loginStep = ref<'password' | 'twofactor'>('password')
const resendLoading = ref(false)
const resendCountdown = ref(0)
let resendTimer: ReturnType<typeof setInterval> | null = null

const codeSending = ref(false)
const codeCountdown = ref(0)
let codeTimer: ReturnType<typeof setInterval> | null = null

const loginForm = reactive({
  username: '',
  password: ''
})

const registerForm = reactive({
  username: '',
  nickname: '',
  email: '',
  password: '',
  code: ''
})

const twoFactorState = reactive({
  challenge_id: '',
  code: '',
  email_hint: ''
})

const captcha = ref({ a: 0, b: 0, op: '+', answer: 0 })
const captchaInput = ref('')

function buildDeviceName() {
  if (!import.meta.client) return 'Web Browser'
  const platform = navigator?.platform || ''
  const ua = navigator?.userAgent || ''
  if (/iPhone/i.test(ua)) return 'iPhone'
  if (/iPad/i.test(ua)) return 'iPad'
  if (/Android/i.test(ua)) return 'Android'
  if (/Mac/i.test(platform)) return 'Mac'
  if (/Win/i.test(platform)) return 'Windows PC'
  return 'Web Browser'
}

function generateLoginCaptcha() {
  const a = Math.floor(Math.random() * 9) + 1
  const b = Math.floor(Math.random() * 9) + 1
  const ops = ['+', '-', '×'] as const
  const op = ops[Math.floor(Math.random() * ops.length)]
  const answer = op === '+' ? a + b : op === '-' ? Math.abs(a - b) : a * b
  const displayA = op === '-' ? Math.max(a, b) : a
  const displayB = op === '-' ? Math.min(a, b) : b
  captcha.value = { a: displayA, b: displayB, op, answer }
  captchaInput.value = ''
}

function resetTwoFactorState() {
  loginStep.value = 'password'
  twoFactorState.challenge_id = ''
  twoFactorState.code = ''
  twoFactorState.email_hint = ''
  resendCountdown.value = 0
  if (resendTimer) clearInterval(resendTimer)
}

function clearMessages() {
  errorMessage.value = ''
  infoMessage.value = ''
}

function clearFieldErrors() {
  fieldErrors.username = ''
  fieldErrors.email = ''
  fieldErrors.code = ''
}

function switchTab(tab: 'login' | 'register') {
  activeTab.value = tab
  resetTwoFactorState()
  clearMessages()
  clearFieldErrors()
}

function startResendCountdown() {
  resendCountdown.value = 60
  if (resendTimer) clearInterval(resendTimer)
  resendTimer = setInterval(() => {
    resendCountdown.value -= 1
    if (resendCountdown.value <= 0 && resendTimer) {
      clearInterval(resendTimer)
      resendTimer = null
      resendCountdown.value = 0
    }
  }, 1000)
}

function startRegisterCodeCountdown() {
  codeCountdown.value = 60
  if (codeTimer) clearInterval(codeTimer)
  codeTimer = setInterval(() => {
    codeCountdown.value -= 1
    if (codeCountdown.value <= 0 && codeTimer) {
      clearInterval(codeTimer)
      codeTimer = null
      codeCountdown.value = 0
    }
  }, 1000)
}

function applyAuthData(data: AuthData) {
  if (!import.meta.client || !data?.token || !data?.user) return
  localStorage.setItem(SESSION_TOKEN_KEY, data.token)
  localStorage.setItem(SESSION_USER_KEY, JSON.stringify(data.user))
  if (data.user.theme) {
    document.documentElement.setAttribute('data-theme', data.user.theme)
  }
}

async function handleLogin() {
  clearMessages()
  if (String(captcha.value.answer) !== captchaInput.value.trim()) {
    errorMessage.value = '验证码错误，请重新输入'
    generateLoginCaptcha()
    return
  }

  loading.value = true
  try {
    const res = await authRepository.login({
      ...loginForm,
      device_name: buildDeviceName()
    }) as { success?: boolean; data?: AuthData & { requires_two_factor?: boolean; challenge_id?: string; email_hint?: string } }

    if (!res?.success) {
      errorMessage.value = '登录失败'
      return
    }

    if (res.data?.requires_two_factor) {
      loginStep.value = 'twofactor'
      twoFactorState.challenge_id = String(res.data.challenge_id || '')
      twoFactorState.email_hint = String(res.data.email_hint || '')
      twoFactorState.code = ''
      startResendCountdown()
      infoMessage.value = '已发送二步验证码，请查收邮箱'
      return
    }

    applyAuthData(res.data || {})
    const redirect = String(route.query.redirect || '/notes')
    await navigateTo(redirect)
  } catch (error) {
    errorMessage.value = getErrorMessage(error, '登录失败，请稍后重试')
    generateLoginCaptcha()
  } finally {
    loading.value = false
  }
}

async function handleVerifyTwoFactor() {
  clearMessages()
  if (!twoFactorState.code.trim()) {
    errorMessage.value = '请输入二步验证码'
    return
  }

  loading.value = true
  try {
    const res = await authRepository.verifyLogin2FA({
      challenge_id: twoFactorState.challenge_id,
      code: twoFactorState.code.trim(),
      device_name: buildDeviceName()
    }) as { success?: boolean; data?: AuthData }

    if (!res?.success) {
      errorMessage.value = '验证码校验失败'
      return
    }

    applyAuthData(res.data || {})
    const redirect = String(route.query.redirect || '/notes')
    await navigateTo(redirect)
  } catch (error) {
    errorMessage.value = getErrorMessage(error, '验证码校验失败')
  } finally {
    loading.value = false
  }
}

async function resendTwoFactorCode() {
  if (!twoFactorState.challenge_id || resendCountdown.value > 0) return
  clearMessages()
  resendLoading.value = true
  try {
    await authRepository.resendLogin2FA(twoFactorState.challenge_id)
    infoMessage.value = '验证码已重新发送'
    startResendCountdown()
  } catch (error) {
    errorMessage.value = getErrorMessage(error, '重发失败，请稍后再试')
  } finally {
    resendLoading.value = false
  }
}

function backToPasswordStep() {
  resetTwoFactorState()
  generateLoginCaptcha()
}

async function sendRegisterCode() {
  clearMessages()
  clearFieldErrors()
  if (!registerForm.email.trim()) {
    fieldErrors.email = '请先输入邮箱'
    return
  }

  codeSending.value = true
  try {
    const res = await authRepository.sendRegisterCode(registerForm.email.trim()) as { success?: boolean; message?: string }
    if (res?.success) {
      infoMessage.value = res.message || '验证码已发送'
      startRegisterCodeCountdown()
    }
  } catch (error) {
    errorMessage.value = getErrorMessage(error, '发送验证码失败')
  } finally {
    codeSending.value = false
  }
}

async function handleRegister() {
  clearMessages()
  clearFieldErrors()
  if (registerForm.username.trim().length < 3) {
    fieldErrors.username = '用户名至少 3 位'
    return
  }
  if (!registerForm.code.trim()) {
    fieldErrors.code = '请输入邮箱验证码'
    return
  }
  if (registerForm.password.length < 6) {
    errorMessage.value = '密码长度不能少于 6 位'
    return
  }

  loading.value = true
  try {
    const res = await authRepository.register({
      username: registerForm.username.trim(),
      nickname: registerForm.nickname.trim(),
      email: registerForm.email.trim(),
      password: registerForm.password,
      code: registerForm.code.trim()
    }) as { success?: boolean; data?: AuthData }

    if (!res?.success) {
      errorMessage.value = '注册失败'
      return
    }

    applyAuthData(res.data || {})
    await navigateTo('/notes')
  } catch (error) {
    const message = getErrorMessage(error, '注册失败')
    if (message.includes('用户名')) {
      fieldErrors.username = message
    } else if (message.includes('邮箱')) {
      fieldErrors.email = message
    } else if (message.includes('验证码')) {
      fieldErrors.code = message
    } else {
      errorMessage.value = message
    }
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  generateLoginCaptcha()
  const reason = String(route.query.reason || '')
  if (reason === 'replaced') {
    infoMessage.value = '你的账号已在其他设备登录，当前会话已失效'
  } else if (reason === 'revoked') {
    infoMessage.value = '当前设备会话已被移除，请重新登录'
  } else if (reason === 'invalid') {
    infoMessage.value = '登录状态已失效，请重新登录'
  }
})

onUnmounted(() => {
  if (resendTimer) clearInterval(resendTimer)
  if (codeTimer) clearInterval(codeTimer)
})
</script>

<style scoped lang="scss" src="~/assets/styles/views/login-view.scss"></style>
