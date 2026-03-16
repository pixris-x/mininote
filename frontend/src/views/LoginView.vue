<template>
  <div class="login-page">
    <!-- 背景装饰 -->
    <div class="deco deco-1">🌸</div>
    <div class="deco deco-2">✨</div>
    <div class="deco deco-3">🌿</div>
    <div class="deco deco-4">💫</div>

    <div class="login-card card">
      <!-- Logo -->
      <div class="login-logo">
        <span class="logo-big">🌸</span>
        <h1 class="logo-title">Mini List</h1>
        <p class="logo-sub">记录每一个美好瞬间 ✨</p>
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
        ❌ {{ errorMsg }}
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
              {{ showPass ? '🙈' : '👁️' }}
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
          <span v-else>🌸 登录</span>
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
              {{ showPass ? '🙈' : '👁️' }}
            </button>
          </div>
        </div>
        <button type="submit" class="btn btn-primary w-full btn-lg" :disabled="loading">
          <span v-if="loading" class="loading-spinner" style="width:18px;height:18px;border-width:2px"></span>
          <span v-else>✨ 创建账号</span>
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
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
    fieldErrors.email = '请先输入邮筱'
    return
  }
  codeSending.value = true
  try {
    await authApi.sendRegisterCode(registerForm.email)
    toast.success('验证码已发送，请查收邮件 📧')
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
      toast.success('登录成功！欢迎回来 🌸')
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
    fieldErrors.code = '请输入邮筱验证码'
    return
  }
  loading.value = true
  try {
    const res = await userStore.register(registerForm)
    if (res.success) {
      toast.success('注册成功！欢迎加入 Mini Note ✨')
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

onMounted(() => generateLoginCaptcha())
onUnmounted(() => clearInterval(codeTimer))
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  background: linear-gradient(135deg, var(--color-pink-light) 0%, var(--color-lavender-light) 50%, var(--color-mint-light) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  position: relative;
  overflow: hidden;
}

/* 背景装饰 */
.deco {
  position: absolute;
  font-size: 48px;
  opacity: 0.15;
  animation: float 4s ease-in-out infinite;
  pointer-events: none;
  user-select: none;
}

.deco-1 { top: 10%; left: 8%; animation-delay: 0s; }
.deco-2 { top: 15%; right: 10%; animation-delay: 1s; font-size: 36px; }
.deco-3 { bottom: 15%; left: 12%; animation-delay: 2s; }
.deco-4 { bottom: 20%; right: 8%; animation-delay: 0.5s; font-size: 40px; }

@keyframes float {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  50% { transform: translateY(-12px) rotate(8deg); }
}

.login-card {
  width: 100%;
  max-width: 420px;
  padding: 32px;
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-lg);
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
}

.login-logo {
  text-align: center;
  margin-bottom: 28px;
}

.logo-big {
  font-size: 52px;
  display: block;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.08); }
}

.logo-title {
  font-size: 28px;
  font-weight: 800;
  color: var(--theme-primary-dark);
  margin: 8px 0 4px;
}

.logo-sub {
  font-size: 13px;
  color: var(--color-text-secondary);
}

/* 标签切换 */
.tab-group {
  display: flex;
  background: var(--color-border);
  border-radius: var(--radius-full);
  padding: 3px;
  margin-bottom: 24px;
}

.tab-btn {
  flex: 1;
  padding: 8px;
  border: none;
  border-radius: var(--radius-full);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  background: transparent;
  color: var(--color-text-secondary);
  transition: all var(--transition);
  font-family: inherit;
}

.tab-btn.active {
  background: var(--color-surface);
  color: var(--theme-primary-dark);
  box-shadow: var(--shadow-sm);
}

/* 错误提示 */
.error-msg {
  background: #FFE0E0;
  color: #C0392B;
  border-radius: var(--radius-md);
  padding: 10px 14px;
  font-size: 13px;
  margin-bottom: 16px;
}

.input-error {
  border-color: #E74C3C !important;
  box-shadow: 0 0 0 2px rgba(231, 76, 60, 0.15);
}

.field-error-msg {
  font-size: 12px;
  color: #C0392B;
  margin: 0;
  padding-left: 2px;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text);
}

.required {
  color: var(--color-pink-dark);
}

.input-wrap {
  position: relative;
}

.input-wrap .input {
  padding-right: 44px;
}

.show-pass {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  font-size: 16px;
  padding: 2px;
  opacity: 0.7;
}

.show-pass:hover {
  opacity: 1;
}

.btn[disabled] {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn[disabled]:hover {
  transform: none;
  box-shadow: none;
}

.forgot-link:hover {
  color: var(--color-pink) !important;
}

/* 图形验证码 */
.captcha-row {
  display: flex;
  gap: 10px;
  align-items: stretch;
}

.captcha-box {
  display: flex;
  align-items: center;
  gap: 4px;
  background: linear-gradient(135deg, #fff0f5, #f0f0ff);
  border: 1.5px dashed var(--theme-primary);
  border-radius: var(--radius-md);
  padding: 10px 14px;
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
  flex-shrink: 0;
  transition: box-shadow 0.15s;
}

.captcha-box:hover {
  box-shadow: 0 0 0 3px rgba(236, 72, 153, 0.12);
}

.captcha-num {
  font-size: 1.2rem;
  font-weight: 800;
  color: #e8698a;
  font-family: 'Courier New', monospace;
  letter-spacing: 1px;
}

.captcha-op {
  font-size: 1.1rem;
  font-weight: 700;
  color: #9b59b6;
  padding: 0 3px;
}

.captcha-eq {
  font-size: 1rem;
  font-weight: 700;
  color: #888;
}

.captcha-input {
  flex: 1;
  min-width: 0;
  text-align: center;
  font-size: 1.1rem;
  font-weight: 700;
}

/* 邮箱 + 发送验证码按钮行 */
.email-code-row {
  display: flex;
  gap: 8px;
}

.email-code-row .input {
  flex: 1;
  min-width: 0;
}

.btn-send-code {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0 14px;
  background: var(--theme-primary-light);
  color: var(--theme-primary-dark);
  border: 1.5px solid var(--theme-primary);
  border-radius: var(--radius-md);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: all var(--transition);
  font-family: inherit;
  flex-shrink: 0;
}

.btn-send-code:hover:not(:disabled) {
  background: var(--theme-primary);
  color: #fff;
}

.btn-send-code:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
</style>
