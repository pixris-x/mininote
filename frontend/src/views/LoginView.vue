<template>
  <div class="login-page">
    <!-- 背景装饰 -->
    <Flower2 class="deco deco-1" />
    <Sparkles class="deco deco-2" />
    <Leaf class="deco deco-3" />
    <Star class="deco deco-4" />

    <div class="login-card card">
      <!-- Logo -->
      <div class="login-logo">
        <Flower2 class="logo-big" />
        <h1 class="logo-title">Mini Note</h1>
        <p class="logo-sub">记录每一个美好瞬间</p>
      </div>

      <!-- 切换标签 -->
      <div class="tab-group">
        <button
          class="tab-btn"
          :class="{ active: activeTab === 'login' }"
          @click="activeTab = 'login'; clearError()"
        >
          登录
        </button>
        <button
          class="tab-btn"
          :class="{ active: activeTab === 'register' }"
          @click="activeTab = 'register'; clearError()"
        >
          注册
        </button>
      </div>

      <!-- 错误提示 -->
      <div v-if="errorMsg" class="error-msg">
        <CircleAlert class="msg-icon" />
        <span>{{ errorMsg }}</span>
      </div>

      <!-- 登录表单 -->
      <form v-if="activeTab === 'login'" @submit.prevent="handleLogin" class="form">
        <div class="form-group">
          <label class="form-label">用户名 / 邮箱</label>
          <input
            v-model="loginForm.username"
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
              :type="showPass ? 'text' : 'password'"
              class="input"
              placeholder="请输入密码"
              autocomplete="current-password"
              required
            />
            <button type="button" class="show-pass" @click="showPass = !showPass">
              <EyeOff v-if="showPass" class="pass-icon" />
              <Eye v-else class="pass-icon" />
            </button>
          </div>
        </div>
        <!-- 图形验证码 -->
        <div class="form-group">
          <label class="form-label">验证码</label>
          <div class="captcha-row">
            <div class="captcha-box" @click="generateLoginCaptcha" title="点击刷新">
              <span class="captcha-num">{{ captcha.a }}</span>
              <span class="captcha-op">{{ captcha.op }}</span>
              <span class="captcha-num">{{ captcha.b }}</span>
              <span class="captcha-eq">=&nbsp;?</span>
            </div>
            <input
              v-model="captchaInput"
              type="text"
              inputmode="numeric"
              class="input captcha-input"
              placeholder="计算结果"
              autocomplete="off"
              maxlength="4"
            />
          </div>
        </div>
        <button type="submit" class="btn btn-primary w-full btn-lg" :disabled="loading">
          <span v-if="loading" class="loading-spinner" style="width:18px;height:18px;border-width:2px"></span>
          <span v-else class="btn-content">
            <LogIn class="btn-icon" />
            登录
          </span>
        </button>
        <div style="text-align:right;margin-top:4px;">
          <router-link to="/forgot-password" style="font-size:13px;color:var(--color-text-muted);text-decoration:none;" class="forgot-link">忘记密码？</router-link>
        </div>
      </form>

      <!-- 注册表单 -->
      <form v-else @submit.prevent="handleRegister" class="form">
        <div class="form-group">
          <label class="form-label">用户名 <span class="required">*</span></label>
          <input
            v-model="registerForm.username"
            type="text"
            :class="['input', { 'input-error': fieldErrors.username }]"
            placeholder="3-20位字母数字"
            autocomplete="username"
            required
            @input="fieldErrors.username = ''"
          />
          <p v-if="fieldErrors.username" class="field-error-msg">{{ fieldErrors.username }}</p>
        </div>
        <div class="form-group">
          <label class="form-label">昵称</label>
          <input
            v-model="registerForm.nickname"
            type="text"
            class="input"
            placeholder="你的显示名称（选填）"
          />
        </div>
        <div class="form-group">
          <label class="form-label">邮箱 <span class="required">*</span></label>
          <div class="email-code-row">
            <input
              v-model="registerForm.email"
              type="email"
              :class="['input', { 'input-error': fieldErrors.email }]"
              placeholder="your@email.com"
              autocomplete="email"
              required
              @input="fieldErrors.email = ''"
            />
            <button type="button" class="btn-send-code" :disabled="codeCountdown > 0 || codeSending"
              @click="sendRegisterCode">
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
            v-model="registerForm.code"
            type="text"
            inputmode="numeric"
            :class="['input', { 'input-error': fieldErrors.code }]"
            placeholder="请输入收到的6位验证码"
            maxlength="6"
            autocomplete="one-time-code"
            @input="fieldErrors.code = ''"
          />
          <p v-if="fieldErrors.code" class="field-error-msg">{{ fieldErrors.code }}</p>
        </div>
        <div class="form-group">
          <label class="form-label">密码 <span class="required">*</span></label>
          <div class="input-wrap">
            <input
              v-model="registerForm.password"
              :type="showPass ? 'text' : 'password'"
              class="input"
              placeholder="至少6位"
              autocomplete="new-password"
              required
            />
            <button type="button" class="show-pass" @click="showPass = !showPass">
              <EyeOff v-if="showPass" class="pass-icon" />
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

<script setup>
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { CircleAlert, Eye, EyeOff, Flower2, Leaf, LogIn, Sparkles, Star, UserPlus } from 'lucide-vue-next'
import { useUserStore } from '@/stores/user'
import { authApi } from '@/api'
import { toast } from '@/utils/toast'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const activeTab = ref('login')
const loading = ref(false)
const errorMsg = ref('')
const showPass = ref(false)

// 登录验证码
const captcha = ref({ a: 0, b: 0, op: '+', answer: 0 })
const captchaInput = ref('')

function generateLoginCaptcha() {
  const a = Math.floor(Math.random() * 9) + 1
  const b = Math.floor(Math.random() * 9) + 1
  const ops = ['+', '-', '×']
  const op = ops[Math.floor(Math.random() * ops.length)]
  let answer
  if (op === '+') answer = a + b
  else if (op === '-') answer = Math.abs(a - b)
  else answer = a * b
  const displayA = op === '-' ? Math.max(a, b) : a
  const displayB = op === '-' ? Math.min(a, b) : b
  captcha.value = { a: displayA, b: displayB, op, answer }
  captchaInput.value = ''
}

// 注册验证码
const codeSending = ref(false)
const codeCountdown = ref(0)
let codeTimer = null

const loginForm = reactive({ username: '', password: '' })
const registerForm = reactive({ username: '', nickname: '', email: '', password: '', code: '' })
const fieldErrors = reactive({ username: '', email: '', code: '' })

function clearError() {
  errorMsg.value = ''
  fieldErrors.username = ''
  fieldErrors.email = ''
  fieldErrors.code = ''
}

async function sendRegisterCode() {
  if (!registerForm.email) {
    fieldErrors.email = '请先输入邮箱'
    return
  }
  codeSending.value = true
  try {
    await authApi.sendRegisterCode(registerForm.email)
    toast.success('验证码已发送，请查收邮件')
    codeCountdown.value = 60
    codeTimer = setInterval(() => {
      codeCountdown.value--
      if (codeCountdown.value <= 0) clearInterval(codeTimer)
    }, 1000)
  } catch (err) {
    if (err.field === 'email') fieldErrors.email = err.message
    else toast.error(err.message)
  } finally {
    codeSending.value = false
  }
}

async function handleLogin() {
  clearError()
  // 验证图形验证码
  if (String(captcha.value.answer) !== captchaInput.value.trim()) {
    errorMsg.value = '验证码错误，请重新计算'
    generateLoginCaptcha()
    return
  }
  loading.value = true
  try {
    const res = await userStore.login(loginForm)
    if (res.success) {
      toast.success('登录成功，欢迎回来')
      const redirect = route.query.redirect || '/notes'
      router.push(redirect)
    }
  } catch (err) {
    errorMsg.value = err.message
    generateLoginCaptcha()
  } finally {
    loading.value = false
  }
}

async function handleRegister() {
  clearError()
  if (registerForm.username.length < 3) {
    errorMsg.value = '用户名至少3位'
    return
  }
  if (!registerForm.code) {
    fieldErrors.code = '请输入邮箱验证码'
    return
  }
  loading.value = true
  try {
    const res = await userStore.register(registerForm)
    if (res.success) {
      toast.success('注册成功，欢迎加入 Mini Note')
      router.push('/notes')
    }
  } catch (err) {
    if (err.field === 'username') {
      fieldErrors.username = err.message
    } else if (err.field === 'email') {
      fieldErrors.email = err.message
    } else if (err.field === 'code') {
      fieldErrors.code = err.message
    } else {
      errorMsg.value = err.message
    }
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  generateLoginCaptcha()
  if (route.query.reason === 'replaced') {
    toast.error('你的账号已在其他设备登录，当前会话已失效')
  }
})
onUnmounted(() => clearInterval(codeTimer))
</script>

<style scoped lang="scss" src="@/assets/styles/views/LoginView.scss"></style>
