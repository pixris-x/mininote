<template>
    <div class="profile-page">
            <!-- 个人信息卡片 -->
            <div class="profile-hero card">
                <div class="avatar-big" :style="{ background: userStore.user?.avatar_color }">
                    {{ userStore.avatarLabel }}
                </div>
                <div class="profile-info">
                    <h2 class="profile-name">{{ userStore.user?.nickname }}</h2>
                    <p class="profile-username">@{{ userStore.user?.username }}</p>
                    <p v-if="userStore.user?.bio" class="profile-bio">{{ userStore.user.bio }}</p>
                    <p v-else class="profile-bio placeholder">还没有个性签名，去写一个吧~</p>
                </div>
                <button class="btn btn-outline btn-sm edit-btn" @click="openEditModal">
                    <SquarePen :size="14" />
                    <span>编辑</span>
                </button>
            </div>

            <!-- 统计数据 -->
            <div class="stats-grid">
                <div class="stat-card card" v-for="s in stats" :key="s.label">
                    <component :is="s.icon" class="stat-icon" :size="22" />
                    <span class="stat-number">{{ s.value }}</span>
                    <span class="stat-label">{{ s.label }}</span>
                </div>
            </div>

            <!-- 主题设置 -->
            <div class="section card">
                <h3 class="section-title">
                    <Brush class="section-title-icon" :size="16" />
                    <span>主题颜色</span>
                </h3>
                <div class="theme-options">
                    <button v-for="theme in themes" :key="theme.value" class="theme-btn"
                        :class="{ active: currentTheme === theme.value }" @click="changeTheme(theme.value)">
                        <span class="theme-swatch" :style="{ background: theme.color }"></span>
                        <span class="theme-name">{{ theme.label }}</span>
                    </button>
                </div>
            </div>

            <!-- 头像颜色 -->
            <div class="section card">
                <h3 class="section-title">
                    <SwatchBook class="section-title-icon" :size="16" />
                    <span>头像颜色</span>
                </h3>
                <div class="avatar-colors">
                    <button v-for="color in avatarColors" :key="color" class="avatar-color-btn"
                        :class="{ active: userStore.user?.avatar_color === color }" :style="{ background: color }"
                        @click="changeAvatarColor(color)">
                        <Check v-if="userStore.user?.avatar_color === color" class="color-check" :size="14" />
                    </button>
                </div>
            </div>

            <!-- 修改密码 -->
            <div class="section card">
                <div class="section-head">
                    <h3 class="section-title">
                        <Shield class="section-title-icon" :size="16" />
                        <span>账号安全</span>
                    </h3>
                    <button class="btn btn-outline btn-sm section-action-btn" @click="showPassModal = true">
                        修改密码
                    </button>
                </div>
                <div class="security-body">
                    <div class="security-row">
                        <div class="security-main">
                            <span class="security-label">二步验证（邮箱验证码）</span>
                            <span class="security-desc">
                                {{ securityState.two_factor_enabled ? '已开启，登录时需输入邮箱验证码' : '未开启，建议开启提升账号安全' }}
                            </span>
                        </div>
                        <button class="btn btn-outline btn-sm" :disabled="twoFactorSending"
                            @click="startTwoFactorToggle(securityState.two_factor_enabled ? 'disable' : 'enable')">
                            {{ twoFactorSending ? '发送中...' : (securityState.two_factor_enabled ? '关闭二步验证' : '开启二步验证') }}
                        </button>
                    </div>
                    <div class="security-row">
                        <div class="security-main">
                            <span class="security-label">邮箱</span>
                            <span class="security-desc">当前邮箱：{{ userStore.user?.email || '-' }}</span>
                        </div>
                        <button class="btn btn-outline btn-sm" @click="openEmailModal">
                            修改邮箱
                        </button>
                    </div>
                    <div class="security-row">
                        <div class="security-main">
                            <span class="security-label">登录设备管理</span>
                            <span class="security-desc">查看最近活跃设备，支持移除指定设备或踢出其他设备</span>
                        </div>
                        <div class="security-actions">
                            <button class="btn btn-outline btn-sm" :disabled="sessionsLoading" @click="loadSessions">
                                刷新设备
                            </button>
                            <button class="btn btn-outline btn-sm" :disabled="revokeOthersLoading" @click="revokeOtherDevices">
                                {{ revokeOthersLoading ? '处理中...' : '踢出其他设备' }}
                            </button>
                        </div>
                    </div>
                    <div class="session-list">
                        <div v-if="sessionsLoading" class="session-empty">设备加载中...</div>
                        <div v-else-if="sessions.length === 0" class="session-empty">暂无设备会话</div>
                        <div v-else v-for="session in sessions" :key="session.session_id" class="session-item">
                            <div class="session-info">
                                <div class="session-title">
                                    <span>{{ session.device_name || 'Unknown Device' }}</span>
                                    <span v-if="session.is_current" class="session-current">当前设备</span>
                                </div>
                                <div class="session-meta">
                                    <span>最近活跃：{{ formatSessionDate(session.last_active_at) }}</span>
                                    <span>IP：{{ session.ip_address || '-' }}</span>
                                </div>
                            </div>
                            <button v-if="!session.is_current" class="btn btn-ghost btn-sm"
                                :disabled="Boolean(sessionActionLoading[session.session_id])"
                                @click="revokeSession(session.session_id)">
                                {{ sessionActionLoading[session.session_id] ? '移除中...' : '移除' }}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 消息通知 -->
            <div class="section card">
                <h3 class="section-title">
                    <Bell class="section-title-icon" :size="16" />
                    <span>消息通知</span>
                </h3>
                <div v-if="!pushSupported" class="push-unsupported">
                    当前浏览器不支持推送通知（需要 iOS 16.4+ 且从主屏幕打开）
                </div>
                <div v-else class="push-row">
                    <div class="push-info">
                        <span class="push-label">计划步骤到期提醒</span>
                        <span class="push-desc">提前一天通过系统通知提醒你</span>
                    </div>
                    <button class="push-toggle" :class="{ active: pushSubscribed }"
                        :disabled="pushLoading" @click="togglePush">
                        <span class="toggle-thumb"></span>
                    </button>
                </div>
                <div v-if="pushSubscribed" class="push-test-row">
                    <button class="btn btn-outline btn-sm" :disabled="testSending" @click="sendTestPush">
                        <template v-if="testSending">发送中...</template>
                        <template v-else>
                            <Send :size="14" />
                            <span>发送测试通知</span>
                        </template>
                    </button>
                </div>
            </div>

            <!-- 管理员入口 -->
            <div v-if="userStore.user?.is_admin" class="section card">
                <div class="section-head">
                    <h3 class="section-title">
                        <Crown class="section-title-icon" :size="16" />
                        <span>管理员</span>
                    </h3>
                    <button class="btn btn-outline btn-sm section-action-btn" @click="router.push('/admin')">
                        进入管理面板
                    </button>
                </div>
            </div>

            <!-- 退出按钮 -->
            <div class="logout-section">
                <button class="btn btn-logout" @click="handleLogout">
                    <LogOut :size="16" />
                    <span>退出登录</span>
                </button>
            </div>
        </div>

        <!-- 编辑资料弹窗 -->
        <Teleport to="body">
            <div v-if="showEditModal" class="modal-overlay" @click.self="showEditModal = false">
                <div class="modal-card card">
                    <div class="modal-header">
                        <h2>
                            <SquarePen :size="18" />
                            <span>编辑资料</span>
                        </h2>
                        <button class="btn btn-ghost btn-icon modal-close-btn" aria-label="关闭" @click="showEditModal = false">
                            <X :size="16" />
                        </button>
                    </div>
                    <form @submit.prevent="saveProfile" class="edit-form">
                        <div class="form-group">
                            <label class="form-label">昵称</label>
                            <input v-model="editForm.nickname" type="text" class="input" placeholder="显示名称" />
                        </div>
                        <div class="form-group">
                            <label class="form-label">个签</label>
                            <textarea v-model="editForm.bio" class="input" placeholder="说说你的故事..." rows="3"
                                style="resize:none"></textarea>
                        </div>
                        <div v-if="editError" class="error-msg">
                            <CircleAlert :size="14" />
                            <span>{{ editError }}</span>
                        </div>
                        <div class="modal-actions">
                            <button type="button" class="btn btn-outline" @click="showEditModal = false">取消</button>
                            <button type="submit" class="btn btn-primary" :disabled="editSaving">
                                <template v-if="editSaving">保存中...</template>
                                <template v-else>
                                    <Save :size="14" />
                                    <span>保存</span>
                                </template>
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </Teleport>

        <!-- 修改密码弹窗 -->
        <Teleport to="body">
            <div v-if="showPassModal" class="modal-overlay" @click.self="showPassModal = false">
                <div class="modal-card card">
                    <div class="modal-header">
                        <h2>
                            <Lock :size="18" />
                            <span>修改密码</span>
                        </h2>
                        <button class="btn btn-ghost btn-icon modal-close-btn" aria-label="关闭" @click="showPassModal = false">
                            <X :size="16" />
                        </button>
                    </div>
                    <form @submit.prevent="savePassword" class="edit-form">
                        <div class="form-group">
                            <label class="form-label">当前密码</label>
                            <input v-model="passForm.old_password" type="password" class="input" placeholder="请输入当前密码"
                                required />
                        </div>
                        <div class="form-group">
                            <label class="form-label">新密码</label>
                            <input v-model="passForm.new_password" type="password" class="input" placeholder="至少6位"
                                required />
                        </div>
                        <div v-if="passError" class="error-msg">
                            <CircleAlert :size="14" />
                            <span>{{ passError }}</span>
                        </div>
                        <div class="modal-actions">
                            <button type="button" class="btn btn-outline" @click="showPassModal = false">取消</button>
                            <button type="submit" class="btn btn-primary" :disabled="passSaving">
                                {{ passSaving ? '修改中...' : '确认修改' }}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </Teleport>

        <!-- 修改邮箱弹窗 -->
        <Teleport to="body">
            <div v-if="showEmailModal" class="modal-overlay" @click.self="closeEmailModal">
                <div class="modal-card card">
                    <div class="modal-header">
                        <h2>
                            <Shield :size="18" />
                            <span>修改邮箱</span>
                        </h2>
                        <button class="btn btn-ghost btn-icon modal-close-btn" aria-label="关闭" @click="closeEmailModal">
                            <X :size="16" />
                        </button>
                    </div>
                    <form @submit.prevent="verifyEmailChange" class="edit-form">
                        <div class="form-group">
                            <label class="form-label">新邮箱</label>
                            <input v-model="emailForm.new_email" type="email" class="input" placeholder="请输入新邮箱" autocomplete="email" required />
                        </div>
                        <div class="form-group">
                            <label class="form-label">当前密码</label>
                            <input v-model="emailForm.current_password" type="password" class="input" placeholder="用于身份验证" autocomplete="current-password" required />
                        </div>
                        <button type="button" class="btn btn-outline" :disabled="emailSendingCode" @click="sendEmailChangeCode">
                            {{ emailSendingCode ? '发送中...' : '发送验证码' }}
                        </button>
                        <div v-if="emailCodeSent" class="form-group">
                            <label class="form-label">邮箱验证码</label>
                            <input v-model="emailForm.code" type="text" inputmode="numeric" maxlength="6"
                                class="input" placeholder="请输入6位验证码" autocomplete="one-time-code" required />
                            <p class="email-tip">验证码将发送到新邮箱，10 分钟内有效。</p>
                        </div>
                        <div v-if="emailError" class="error-msg">
                            <CircleAlert :size="14" />
                            <span>{{ emailError }}</span>
                        </div>
                        <div class="modal-actions">
                            <button type="button" class="btn btn-outline" @click="closeEmailModal">取消</button>
                            <button type="submit" class="btn btn-primary" :disabled="emailVerifying || !emailCodeSent">
                                {{ emailVerifying ? '提交中...' : '确认修改' }}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </Teleport>

        <!-- 二步验证验证码弹窗 -->
        <Teleport to="body">
            <div v-if="showTwoFactorModal" class="modal-overlay" @click.self="closeTwoFactorModal">
                <div class="modal-card card">
                    <div class="modal-header">
                        <h2>
                            <Shield :size="18" />
                            <span>{{ twoFactorAction === 'enable' ? '开启二步验证' : '关闭二步验证' }}</span>
                        </h2>
                        <button class="btn btn-ghost btn-icon modal-close-btn" aria-label="关闭" @click="closeTwoFactorModal">
                            <X :size="16" />
                        </button>
                    </div>
                    <form @submit.prevent="verifyTwoFactorToggle" class="edit-form">
                        <div class="form-group">
                            <label class="form-label">邮箱验证码</label>
                            <input v-model="twoFactorCode" type="text" inputmode="numeric" maxlength="6"
                                class="input" placeholder="请输入6位验证码" autocomplete="one-time-code" required />
                        </div>
                        <div class="modal-actions">
                            <button type="button" class="btn btn-outline" @click="closeTwoFactorModal">取消</button>
                            <button type="submit" class="btn btn-primary" :disabled="twoFactorVerifying">
                                {{ twoFactorVerifying ? '验证中...' : '确认' }}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </Teleport>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useNotesStore } from '@/stores/notes'
import { userApi, pushApi } from '@/api'
import { toast } from '@/utils/toast'
import dayjs from 'dayjs'
import {
    isPushSupported,
    subscribePush,
    unsubscribePush,
    checkPushSubscribed
} from '@/utils/push'
import {
    Bell,
    Brush,
    CalendarDays,
    Check,
    CircleAlert,
    Crown,
    Lock,
    LogOut,
    NotebookText,
    Pin,
    Save,
    Send,
    Shield,
    SquarePen,
    SwatchBook,
    X
} from 'lucide-vue-next'

const router = useRouter()
const userStore = useUserStore()
const notesStore = useNotesStore()

const showEditModal = ref(false)
const showPassModal = ref(false)
const editSaving = ref(false)
const passSaving = ref(false)
const editError = ref('')
const passError = ref('')
const securityState = reactive({ two_factor_enabled: false, current_session_id: '' })
const sessions = ref([])
const sessionsLoading = ref(false)
const showTwoFactorModal = ref(false)
const twoFactorAction = ref('enable')
const twoFactorCode = ref('')
const twoFactorSending = ref(false)
const twoFactorVerifying = ref(false)
const revokeOthersLoading = ref(false)
const sessionActionLoading = ref({})

// Push 通知
const pushSupported = isPushSupported()
const pushSubscribed = ref(false)
const pushLoading = ref(false)
const testSending = ref(false)

async function togglePush() {
    pushLoading.value = true
    try {
        if (pushSubscribed.value) {
            await unsubscribePush()
            pushSubscribed.value = false
            toast.success('已关闭推送通知')
        } else {
            const result = await subscribePush()
            if (result === 'granted') {
                pushSubscribed.value = true
                toast.success('已开启推送通知')
            } else if (result === 'denied') {
                toast.error('通知权限被拒绝，请在系统设置中允许')
            } else {
                toast.error('订阅失败，请稍后再试')
            }
        }
    } finally {
        pushLoading.value = false
    }
}

async function sendTestPush() {
    testSending.value = true
    try {
        await pushApi.sendTest()
        toast.success('测试通知已发送，请注意查收')
    } catch (err) {
        toast.error(err.message || '发送失败')
    } finally {
        testSending.value = false
    }
}

const themes = [
    { value: 'pink', label: '樱花粉', color: '#FFB3C6' },
    { value: 'mint', label: '薄荷绿', color: '#B5EAD7' },
    { value: 'lavender', label: '薰衣草', color: '#C7CEEA' },
    { value: 'peach', label: '蜜桃', color: '#FFDAC1' },
    { value: 'sky', label: '天空蓝', color: '#C1E1FF' }
]

const avatarColors = [
    '#FFB3C6', '#FF85A1', '#B5EAD7', '#7DD6B3',
    '#C7CEEA', '#8E9AC8', '#FFDAC1', '#FFB08A',
    '#C1E1FF', '#7FC0FF', '#FFFACD', '#A8E6CF'
]

const currentTheme = computed(() => userStore.user?.theme || 'pink')

const stats = computed(() => [
    { icon: NotebookText, value: notesStore.notes.length, label: '记事' },
    { icon: Pin, value: notesStore.notes.filter(n => n.is_pinned).length, label: '置顶' },
    { icon: CalendarDays, value: Math.ceil((Date.now() - new Date(userStore.user?.created_at || Date.now())) / 86400000), label: '天' }
])

const editForm = reactive({ nickname: '', bio: '' })
const passForm = reactive({ old_password: '', new_password: '' })
const showEmailModal = ref(false)
const emailSendingCode = ref(false)
const emailVerifying = ref(false)
const emailCodeSent = ref(false)
const emailError = ref('')
const emailForm = reactive({ new_email: '', current_password: '', code: '' })

function formatSessionDate(date) {
    if (!date) return '-'
    return dayjs(date).format('YYYY/MM/DD HH:mm')
}

async function loadSecurity() {
    try {
        const res = await userApi.getSecurity()
        if (res.success) {
            securityState.two_factor_enabled = Boolean(res.data.two_factor_enabled)
            securityState.current_session_id = res.data.current_session_id || ''
        }
    } catch (err) {
        toast.error(err.message || '获取安全信息失败')
    }
}

async function loadSessions() {
    sessionsLoading.value = true
    try {
        const res = await userApi.getSessions()
        if (res.success) sessions.value = res.data || []
    } catch (err) {
        toast.error(err.message || '获取设备列表失败')
    } finally {
        sessionsLoading.value = false
    }
}

async function startTwoFactorToggle(action) {
    twoFactorSending.value = true
    try {
        await userApi.sendTwoFactorCode(action)
        twoFactorAction.value = action
        twoFactorCode.value = ''
        showTwoFactorModal.value = true
        toast.success('验证码已发送，请查收邮箱')
    } catch (err) {
        toast.error(err.message || '发送验证码失败')
    } finally {
        twoFactorSending.value = false
    }
}

function closeTwoFactorModal() {
    showTwoFactorModal.value = false
    twoFactorCode.value = ''
}

async function verifyTwoFactorToggle() {
    if (!twoFactorCode.value.trim()) {
        toast.error('请输入验证码')
        return
    }
    twoFactorVerifying.value = true
    try {
        const res = await userApi.verifyTwoFactor(twoFactorAction.value, twoFactorCode.value.trim())
        if (res.success) {
            securityState.two_factor_enabled = Boolean(res.data?.two_factor_enabled)
            await userStore.fetchProfile()
            toast.success(res.message || '操作成功')
            closeTwoFactorModal()
        }
    } catch (err) {
        toast.error(err.message || '验证失败')
    } finally {
        twoFactorVerifying.value = false
    }
}

function openEmailModal() {
    emailForm.new_email = userStore.user?.email || ''
    emailForm.current_password = ''
    emailForm.code = ''
    emailCodeSent.value = false
    emailError.value = ''
    showEmailModal.value = true
}

function closeEmailModal() {
    showEmailModal.value = false
    emailError.value = ''
    emailCodeSent.value = false
    emailForm.code = ''
}

async function sendEmailChangeCode() {
    emailError.value = ''
    const newEmail = emailForm.new_email.trim()

    if (!newEmail || !emailForm.current_password) {
        emailError.value = '请先输入新邮箱和当前密码'
        return
    }

    emailSendingCode.value = true
    try {
        const res = await userApi.sendEmailChangeCode(newEmail, emailForm.current_password)
        if (res.success) {
            emailCodeSent.value = true
            toast.success(res.message || '验证码已发送')
        }
    } catch (err) {
        emailError.value = err.message
    } finally {
        emailSendingCode.value = false
    }
}

async function verifyEmailChange() {
    emailError.value = ''
    if (!emailCodeSent.value) {
        emailError.value = '请先发送验证码'
        return
    }

    const newEmail = emailForm.new_email.trim()
    const code = emailForm.code.trim()
    if (!newEmail || !code) {
        emailError.value = '请填写完整信息'
        return
    }

    emailVerifying.value = true
    try {
        const res = await userApi.verifyEmailChange(newEmail, code)
        if (res.success) {
            await userStore.fetchProfile()
            toast.success(res.message || '邮箱修改成功')
            closeEmailModal()
        }
    } catch (err) {
        emailError.value = err.message
    } finally {
        emailVerifying.value = false
    }
}

async function revokeSession(sessionId) {
    sessionActionLoading.value = { ...sessionActionLoading.value, [sessionId]: true }
    try {
        await userApi.revokeSession(sessionId)
        toast.success('设备已移除')
        await loadSessions()
    } catch (err) {
        toast.error(err.message || '移除失败')
    } finally {
        const next = { ...sessionActionLoading.value }
        delete next[sessionId]
        sessionActionLoading.value = next
    }
}

async function revokeOtherDevices() {
    revokeOthersLoading.value = true
    try {
        const res = await userApi.revokeOtherSessions()
        toast.success(res.message || '已踢出其他设备')
        await loadSessions()
    } catch (err) {
        toast.error(err.message || '操作失败')
    } finally {
        revokeOthersLoading.value = false
    }
}

function openEditModal() {
    editForm.nickname = userStore.user?.nickname || ''
    editForm.bio = userStore.user?.bio || ''
    editError.value = ''
    showEditModal.value = true
}

async function saveProfile() {
    editError.value = ''
    editSaving.value = true
    try {
        await userStore.updateProfile(editForm)
        toast.success('资料更新成功')
        showEditModal.value = false
    } catch (err) {
        editError.value = err.message
    } finally {
        editSaving.value = false
    }
}

async function changeTheme(theme) {
    try {
        await userStore.updateProfile({ theme })
        toast.success(`已切换到${themes.find(t => t.value === theme)?.label}主题`)
    } catch (err) {
        toast.error(err.message)
    }
}

async function changeAvatarColor(color) {
    try {
        await userStore.updateProfile({ avatar_color: color })
        toast.success('头像颜色已更新')
    } catch (err) {
        toast.error(err.message)
    }
}

async function savePassword() {
    passError.value = ''
    if (passForm.new_password.length < 6) {
        passError.value = '新密码至少6位'
        return
    }
    passSaving.value = true
    try {
        const res = await userApi.changePassword(passForm)
        if (res.success) {
            toast.success('密码修改成功')
            showPassModal.value = false
            passForm.old_password = ''
            passForm.new_password = ''
        }
    } catch (err) {
        passError.value = err.message
    } finally {
        passSaving.value = false
    }
}

function handleLogout() {
    userStore.logout()
    toast.success('已退出登录')
    router.push('/login')
}

onMounted(() => {
    userStore.fetchProfile()
    notesStore.fetchNotes()
    loadSecurity()
    loadSessions()
    if (pushSupported) {
        checkPushSubscribed().then(v => { pushSubscribed.value = v })
    }
})
</script>

<style scoped lang="scss" src="@/assets/styles/views/ProfileView.scss"></style>

