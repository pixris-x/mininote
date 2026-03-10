<template>
    <AppLayout>
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
                    ✏️ 编辑
                </button>
            </div>

            <!-- 统计数据 -->
            <div class="stats-grid">
                <div class="stat-card card" v-for="s in stats" :key="s.label">
                    <span class="stat-icon">{{ s.icon }}</span>
                    <span class="stat-number">{{ s.value }}</span>
                    <span class="stat-label">{{ s.label }}</span>
                </div>
            </div>

            <!-- 主题设置 -->
            <div class="section card">
                <h3 class="section-title">🎨 主题颜色</h3>
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
                <h3 class="section-title">🌈 头像颜色</h3>
                <div class="avatar-colors">
                    <button v-for="color in avatarColors" :key="color" class="avatar-color-btn"
                        :class="{ active: userStore.user?.avatar_color === color }" :style="{ background: color }"
                        @click="changeAvatarColor(color)">
                        <span v-if="userStore.user?.avatar_color === color" class="color-check">✓</span>
                    </button>
                </div>
            </div>

            <!-- 修改密码 -->
            <div class="section card">
                <h3 class="section-title">🔐 账号安全</h3>
                <button class="btn btn-outline" @click="showPassModal = true">
                    修改密码
                </button>
            </div>

            <!-- 退出按钮 -->
            <div class="logout-section">
                <button class="btn btn-logout" @click="handleLogout">
                    🚪 退出登录
                </button>
            </div>
        </div>

        <!-- 编辑资料弹窗 -->
        <Teleport to="body">
            <div v-if="showEditModal" class="modal-overlay" @click.self="showEditModal = false">
                <div class="modal-card card">
                    <div class="modal-header">
                        <h2>✏️ 编辑资料</h2>
                        <button class="btn btn-ghost btn-icon" @click="showEditModal = false">✕</button>
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
                        <div v-if="editError" class="error-msg">❌ {{ editError }}</div>
                        <div class="modal-actions">
                            <button type="button" class="btn btn-outline" @click="showEditModal = false">取消</button>
                            <button type="submit" class="btn btn-primary" :disabled="editSaving">
                                {{ editSaving ? '保存中...' : '保存 💾' }}
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
                        <h2>🔐 修改密码</h2>
                        <button class="btn btn-ghost btn-icon" @click="showPassModal = false">✕</button>
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
                        <div v-if="passError" class="error-msg">❌ {{ passError }}</div>
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
    </AppLayout>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AppLayout from '@/components/AppLayout.vue'
import { useUserStore } from '@/stores/user'
import { useNotesStore } from '@/stores/notes'
import { userApi } from '@/api'
import { toast } from '@/utils/toast'

const router = useRouter()
const userStore = useUserStore()
const notesStore = useNotesStore()

const showEditModal = ref(false)
const showPassModal = ref(false)
const editSaving = ref(false)
const passSaving = ref(false)
const editError = ref('')
const passError = ref('')

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
    { icon: '📝', value: notesStore.notes.length, label: '记事' },
    { icon: '📌', value: notesStore.notes.filter(n => n.is_pinned).length, label: '置顶' },
    { icon: '🌸', value: Math.ceil((Date.now() - new Date(userStore.user?.created_at || Date.now())) / 86400000), label: '天' }
])

const editForm = reactive({ nickname: '', bio: '' })
const passForm = reactive({ old_password: '', new_password: '' })

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
        toast.success('资料更新成功 ✨')
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
        toast.success(`已切换到${themes.find(t => t.value === theme)?.label}主题 🎨`)
    } catch (err) {
        toast.error(err.message)
    }
}

async function changeAvatarColor(color) {
    try {
        await userStore.updateProfile({ avatar_color: color })
        toast.success('头像颜色已更新 🌈')
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
            toast.success('密码修改成功 🔐')
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
    toast.success('已退出登录 👋')
    router.push('/login')
}

onMounted(() => {
    userStore.fetchProfile()
    notesStore.fetchNotes()
})
</script>

<style scoped>
.profile-page {
    padding: 24px 20px;
    max-width: 600px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 16px;
}

/* 个人信息卡片 */
.profile-hero {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 24px;
    position: relative;
}

.avatar-big {
    width: 72px;
    height: 72px;
    border-radius: var(--radius-full);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 32px;
    font-weight: 800;
    color: white;
    flex-shrink: 0;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.profile-info {
    flex: 1;
    min-width: 0;
}

.profile-name {
    font-size: 20px;
    font-weight: 800;
    color: var(--color-text);
    margin-bottom: 2px;
}

.profile-username {
    font-size: 13px;
    color: var(--color-text-secondary);
    margin-bottom: 4px;
}

.profile-bio {
    font-size: 13px;
    color: var(--color-text);
    word-break: break-all;
}

.profile-bio.placeholder {
    color: var(--color-text-light);
    font-style: italic;
}

.edit-btn {
    position: absolute;
    top: 20px;
    right: 20px;
}

/* 统计 */
.stats-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
}

.stat-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 20px 12px;
    gap: 4px;
    border-radius: var(--radius-lg);
}

.stat-icon {
    font-size: 24px;
}

.stat-number {
    font-size: 26px;
    font-weight: 800;
    color: var(--theme-primary-dark);
}

.stat-label {
    font-size: 12px;
    color: var(--color-text-secondary);
}

/* 设置区块 */
.section {
    padding: 20px;
}

.section-title {
    font-size: 15px;
    font-weight: 700;
    color: var(--color-text);
    margin-bottom: 14px;
}

/* 主题选择 */
.theme-options {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
}

.theme-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 14px;
    border-radius: var(--radius-full);
    border: 2px solid var(--color-border);
    background: transparent;
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
    color: var(--color-text);
    transition: all var(--transition);
    font-family: inherit;
}

.theme-btn:hover,
.theme-btn.active {
    border-color: var(--theme-primary-dark);
    background: var(--theme-primary-light);
    color: var(--theme-primary-dark);
}

.theme-swatch {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.theme-name {
    font-size: 13px;
}

/* 头像颜色 */
.avatar-colors {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
}

.avatar-color-btn {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border: 3px solid transparent;
    cursor: pointer;
    transition: all var(--transition);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
}

.avatar-color-btn:hover,
.avatar-color-btn.active {
    transform: scale(1.2);
    border-color: var(--theme-primary-dark);
}

.color-check {
    font-size: 14px;
    color: white;
    font-weight: 700;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

/* 退出 */
.logout-section {
    padding-bottom: 24px;
}

.btn-logout {
    width: 100%;
    padding: 14px;
    background: #FFF0F0;
    color: #E74C3C;
    border: 2px solid #FFD5D5;
    border-radius: var(--radius-lg);
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all var(--transition);
    font-family: inherit;
}

.btn-logout:hover {
    background: #FFE0E0;
    border-color: #E74C3C;
}

/* 弹窗 */
.modal-card {
    width: 100%;
    max-width: 420px;
    padding: 24px;
    animation: popIn 0.2s ease;
}

.edit-form {
    display: flex;
    flex-direction: column;
    gap: 14px;
}

.form-label {
    color: var(--color-text); /* 覆盖全局的 color-text-secondary，此页使用深色 */
}
</style>
