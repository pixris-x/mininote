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
          <input
            v-model="registerForm.email"
            type="email"
            :class="['input', { 'input-error': fieldErrors.email }]"
            placeholder="your@email.com"
            autocomplete="email"
            required
            @input="fieldErrors.email = ''"
          />
          <p v-if="fieldErrors.email" class="field-error-msg">{{ fieldErrors.email }}</p>
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
import { ref, reactive } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { toast } from '@/utils/toast'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const activeTab = ref('login')
const loading = ref(false)
const errorMsg = ref('')
const showPass = ref(false)

const loginForm = reactive({ username: '', password: '' })
const registerForm = reactive({ username: '', nickname: '', email: '', password: '' })
const fieldErrors = reactive({ username: '', email: '' })

function clearError() {
  errorMsg.value = ''
  fieldErrors.username = ''
  fieldErrors.email = ''
}

async function handleLogin() {
  clearError()
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
  loading.value = true
  try {
    const res = await userStore.register(registerForm)
    if (res.success) {
      toast.success('注册成功！欢迎加入 MiniList ✨')
      router.push('/notes')
    }
  } catch (err) {
    if (err.field === 'username') {
      fieldErrors.username = err.message
    } else if (err.field === 'email') {
      fieldErrors.email = err.message
    } else {
      errorMsg.value = err.message
    }
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
</style>
