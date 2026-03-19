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
        <KeyRound class="logo-big" />
        <h1 class="logo-title">找回密码</h1>
        <p class="logo-sub">{{ step === 1 ? '输入注册邮箱，获取验证码' : '输入验证码和新密码' }}</p>
      </div>

      <!-- 步骤指示 -->
      <div class="step-indicator">
        <div class="step" :class="{ active: step >= 1, done: step > 1 }">
          <span class="step-dot">{{ step > 1 ? '✓' : '1' }}</span>
          <span class="step-label">发送验证码</span>
        </div>
        <div class="step-line" :class="{ active: step > 1 }"></div>
        <div class="step" :class="{ active: step >= 2 }">
          <span class="step-dot">2</span>
          <span class="step-label">重置密码</span>
        </div>
      </div>

      <!-- 错误 / 成功提示 -->
      <div v-if="errorMsg" class="error-msg">
        <CircleAlert class="msg-icon" />
        <span>{{ errorMsg }}</span>
      </div>
      <div v-if="successMsg" class="success-msg">
        <CheckCircle2 class="msg-icon" />
        <span>{{ successMsg }}</span>
      </div>

      <!-- Step 1: 输入邮箱 -->
      <form v-if="step === 1" @submit.prevent="handleSendCode" class="form">
        <div class="form-group">
          <label class="form-label">注册邮箱</label>
          <input
            v-model="email"
            type="email"
            class="input"
            placeholder="your@email.com"
            autocomplete="email"
            required
          />
        </div>
        <button type="submit" class="btn btn-primary w-full btn-lg" :disabled="loading || countdown > 0">
          <span v-if="loading" class="loading-spinner" style="width:18px;height:18px;border-width:2px"></span>
          <span v-else-if="countdown > 0">{{ countdown }}s 后可重新发送</span>
          <span v-else class="btn-content">
            <Mail class="btn-icon" />
            发送验证码
          </span>
        </button>
      </form>

      <!-- Step 2: 输入验证码 + 新密码 -->
      <form v-if="step === 2" @submit.prevent="handleResetPassword" class="form">
        <div class="form-group">
          <label class="form-label">邮箱</label>
          <input :value="email" type="email" class="input" disabled style="opacity:0.6;cursor:not-allowed;" />
        </div>
        <div class="form-group">
          <label class="form-label">验证码</label>
          <div style="display:flex;gap:8px;">
            <input
              v-model="code"
              type="text"
              class="input"
              placeholder="请输入6位验证码"
              maxlength="6"
              style="flex:1;letter-spacing:6px;font-size:20px;font-weight:700;text-align:center;"
              required
            />
            <button
              type="button"
              class="btn"
              style="white-space:nowrap;padding:0 14px;font-size:13px;"
              :disabled="loading || countdown > 0"
              @click="handleSendCode"
            >
              {{ countdown > 0 ? `${countdown}s` : '重新发送' }}
            </button>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">新密码</label>
          <div class="input-wrap">
            <input
              v-model="newPassword"
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
        <div class="form-group">
          <label class="form-label">确认新密码</label>
          <div class="input-wrap">
            <input
              v-model="confirmPassword"
              :type="showPass ? 'text' : 'password'"
              class="input"
              placeholder="再次输入新密码"
              autocomplete="new-password"
              required
            />
          </div>
        </div>
        <button type="submit" class="btn btn-primary w-full btn-lg" :disabled="loading">
          <span v-if="loading" class="loading-spinner" style="width:18px;height:18px;border-width:2px"></span>
          <span v-else class="btn-content">
            <KeyRound class="btn-icon" />
            重置密码
          </span>
        </button>
      </form>

      <!-- 返回登录 -->
      <div style="text-align:center;margin-top:20px;">
        <router-link to="/login" class="back-link">
          <ArrowLeft class="back-icon" />
          返回登录
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, CheckCircle2, CircleAlert, Eye, EyeOff, Flower2, KeyRound, Leaf, Mail, Sparkles, Star } from 'lucide-vue-next'
import api from '@/api'
import { toast } from '@/utils/toast'

const router = useRouter()

const step = ref(1)
const loading = ref(false)
const errorMsg = ref('')
const successMsg = ref('')
const countdown = ref(0)

const email = ref('')
const code = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const showPass = ref(false)

let countdownTimer = null

function startCountdown() {
  countdown.value = 60
  clearInterval(countdownTimer)
  countdownTimer = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) clearInterval(countdownTimer)
  }, 1000)
}

async function handleSendCode() {
  errorMsg.value = ''
  successMsg.value = ''
  if (!email.value) {
    errorMsg.value = '请输入邮箱'
    return
  }
  loading.value = true
  try {
    await api.post('/auth/forgot-password', { email: email.value })
    successMsg.value = '验证码已发送，请查收邮件（15分钟内有效）'
    toast.success('验证码已发送')
    step.value = 2
    startCountdown()
  } catch (err) {
    errorMsg.value = err.message || '发送失败，请稍后重试'
  } finally {
    loading.value = false
  }
}

async function handleResetPassword() {
  errorMsg.value = ''
  successMsg.value = ''
  if (code.value.length !== 6) {
    errorMsg.value = '请输入6位验证码'
    return
  }
  if (newPassword.value.length < 6) {
    errorMsg.value = '密码长度不能少于6位'
    return
  }
  if (newPassword.value !== confirmPassword.value) {
    errorMsg.value = '两次输入的密码不一致'
    return
  }
  loading.value = true
  try {
    await api.post('/auth/reset-password', {
      email: email.value,
      code: code.value,
      newPassword: newPassword.value
    })
    toast.success('密码重置成功，请使用新密码登录')
    router.push('/login')
  } catch (err) {
    errorMsg.value = err.message || '重置失败，请检查验证码是否正确'
  } finally {
    loading.value = false
  }
}
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

.login-card {
  width: 100%;
  max-width: 420px;
  padding: 40px 36px;
  position: relative;
  z-index: 1;
}

.login-logo {
  text-align: center;
  margin-bottom: 28px;
}
.logo-big {
  width: 48px;
  height: 48px;
  display: block;
  margin: 0 auto 8px;
  color: var(--theme-primary);
}
.logo-title { font-size: 24px; font-weight: 700; margin: 0 0 4px; color: var(--color-text-primary); }
.logo-sub { font-size: 14px; color: var(--color-text-muted); margin: 0; }

/* 步骤指示器 */
.step-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 28px;
  gap: 8px;
}
.step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  opacity: 0.4;
  transition: opacity 0.3s;
}
.step.active { opacity: 1; }
.step-dot {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--color-pink-light);
  border: 2px solid #ffb3c6;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  color: var(--color-pink);
}
.step.active .step-dot {
  background: var(--color-pink);
  color: #fff;
  border-color: var(--color-pink);
}
.step.done .step-dot {
  background: #b5ead7;
  border-color: #b5ead7;
  color: #2d8f6f;
}
.step-label { font-size: 11px; color: var(--color-text-muted); white-space: nowrap; }
.step-line {
  flex: 1;
  height: 2px;
  background: var(--color-pink-light);
  border-radius: 2px;
  max-width: 60px;
  transition: background 0.3s;
}
.step-line.active { background: var(--color-pink); }

.error-msg {
  background: #fff5f5;
  border: 1px solid #fecaca;
  color: #e53e3e;
  border-radius: 10px;
  padding: 10px 14px;
  font-size: 13px;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.success-msg {
  background: #f0fff4;
  border: 1px solid #b5ead7;
  color: #2d8f6f;
  border-radius: 10px;
  padding: 10px 14px;
  font-size: 13px;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.msg-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.form { display: flex; flex-direction: column; gap: 16px; }
.form-group { display: flex; flex-direction: column; gap: 6px; }
.form-label { font-size: 14px; font-weight: 500; color: var(--color-text-secondary); }
.input-wrap { position: relative; }
.show-pass {
  position: absolute;
  right: 6px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  width: 36px;
  height: 36px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-muted);
}

.pass-icon {
  width: 18px;
  height: 18px;
}

.btn-content {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.btn-icon {
  width: 16px;
  height: 16px;
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--color-text-muted);
  text-decoration: none;
  transition: color 0.2s;
}
.back-link:hover { color: var(--color-pink); }

.back-icon {
  width: 14px;
  height: 14px;
}

.deco {
  position: absolute;
  width: 60px;
  height: 60px;
  stroke-width: 1.8;
  opacity: 0.12;
  pointer-events: none;
  animation: float 6s ease-in-out infinite;
}
.deco-1 { top: 5%; left: 5%; animation-delay: 0s; }
.deco-2 { top: 10%; right: 8%; animation-delay: 1.5s; }
.deco-3 { bottom: 10%; left: 8%; animation-delay: 3s; }
.deco-4 { bottom: 5%; right: 5%; animation-delay: 4.5s; }

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-12px); }
}
</style>
