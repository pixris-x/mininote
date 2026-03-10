<template>
    <AppLayout>
        <div class="plans-page">

            <!-- ── 左侧面板：计划列表 ── -->
            <aside class="plans-sidebar">
                <div class="plans-sidebar-header">
                    <h2 class="sidebar-title">🎯 我的计划</h2>
                    <button class="btn btn-primary btn-sm" @click="openPlanModal()">＋ 新建</button>
                </div>

                <!-- 过滤 -->
                <div class="plan-filters">
                    <button v-for="f in planFilters" :key="f.value" class="filter-btn"
                        :class="{ active: activeFilter === f.value }" @click="activeFilter = f.value">{{ f.label
                        }}</button>
                </div>

                <!-- 加载中 -->
                <div v-if="planStore.loading && !planStore.plans.length" class="loading-center">
                    <div class="loading-spinner"></div>
                </div>

                <!-- 空状态 -->
                <div v-else-if="filteredPlans.length === 0" class="plans-empty">
                    <span>📋</span>
                    <p>还没有计划哦～</p>
                </div>

                <!-- 计划卡片列表 -->
                <div v-else class="plan-list">
                    <div v-for="plan in filteredPlans" :key="plan.id" class="plan-card"
                        :class="{ active: currentPlanId === plan.id }"
                        :style="{ borderLeftColor: plan.color === '#FFFFFF' ? 'var(--theme-primary)' : plan.color }"
                        @click="selectPlan(plan.id)">
                        <div class="plan-card-top">
                            <span class="plan-card-icon">{{ plan.icon }}</span>
                            <div class="plan-card-info">
                                <div class="plan-card-title">{{ plan.title }}</div>
                                <div class="plan-card-desc">{{ plan.description || '暂无描述' }}</div>
                            </div>
                            <div class="plan-card-actions">
                                <button class="btn btn-ghost btn-icon-sm" @click.stop="openPlanModal(plan)"
                                    title="编辑">✏️</button>
                                <button class="btn btn-ghost btn-icon-sm" @click.stop="confirmDeletePlan(plan)"
                                    title="删除">🗑️</button>
                            </div>
                        </div>
                        <div class="plan-card-bottom">
                            <span class="plan-status-badge" :class="`status-${plan.status}`">
                                {{ statusLabel[plan.status] }}
                            </span>
                            <div class="plan-progress-wrap">
                                <div class="plan-progress-bar">
                                    <div class="plan-progress-fill" :style="{ width: progressPct(plan) + '%' }"></div>
                                </div>
                                <span class="plan-progress-text">{{ plan.done_steps }}/{{ plan.total_steps }}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </aside>

            <!-- ── 右侧面板：时间线 ── -->
            <main class="plans-main">
                <!-- 未选择计划 -->
                <div v-if="!currentPlanId" class="timeline-empty">
                    <span class="timeline-empty-icon">🎯</span>
                    <h3>选择一个计划</h3>
                    <p>从左侧选择计划，或新建一个开始你的旅程 🌸</p>
                </div>

                <template v-else>
                    <!-- 计划标题栏 -->
                    <div class="timeline-header">
                        <div class="timeline-header-left">
                            <span class="timeline-plan-icon">{{ planStore.currentPlan?.icon }}</span>
                            <div>
                                <h2 class="timeline-plan-title">{{ planStore.currentPlan?.title }}</h2>
                                <p v-if="planStore.currentPlan?.description" class="timeline-plan-desc">
                                    {{ planStore.currentPlan?.description }}
                                </p>
                            </div>
                        </div>
                        <button class="btn btn-primary btn-sm" @click="openStepModal()">＋ 添加步骤</button>
                    </div>

                    <!-- 加载中 -->
                    <div v-if="planStore.loading" class="loading-center">
                        <div class="loading-spinner"></div>
                        <p>加载中...</p>
                    </div>

                    <!-- 空状态 -->
                    <div v-else-if="!planStore.currentPlan?.steps?.length" class="timeline-empty">
                        <span class="timeline-empty-icon">📋</span>
                        <h3>暂无步骤</h3>
                        <p>点击「添加步骤」开始规划你的第一步 ✨</p>
                    </div>

                    <!-- 时间线 -->
                    <div v-else class="timeline">
                        <div v-for="(step, idx) in planStore.currentPlan.steps" :key="step.id" class="timeline-item"
                            :class="`step-${step.status}`">
                            <!-- 时间线竖线 + 节点 -->
                            <div class="timeline-line">
                                <div class="timeline-dot" :class="`dot-${step.status}`">
                                    {{ stepStatusIcon[step.status] }}
                                </div>
                                <div v-if="idx < planStore.currentPlan.steps.length - 1" class="timeline-connector">
                                </div>
                            </div>

                            <!-- 步骤卡片 -->
                            <div class="timeline-card">
                                <div class="timeline-card-header">
                                    <div class="timeline-card-title-row">
                                        <span class="timeline-step-num">第 {{ idx + 1 }} 步</span>
                                        <!-- 特殊标识 badge -->
                                        <span v-if="step.badge" class="step-badge" :style="badgeStyle(step)">
                                            {{ step.badge }}
                                        </span>
                                    </div>
                                    <div class="timeline-card-actions">
                                        <!-- 上移/下移 -->
                                        <button v-if="idx > 0" class="btn btn-ghost btn-icon-sm"
                                            @click="moveStep(idx, -1)" title="上移">↑</button>
                                        <button v-if="idx < planStore.currentPlan.steps.length - 1"
                                            class="btn btn-ghost btn-icon-sm" @click="moveStep(idx, 1)"
                                            title="下移">↓</button>
                                        <button class="btn btn-ghost btn-icon-sm" @click="openStepModal(step)"
                                            title="编辑">✏️</button>
                                        <button class="btn btn-ghost btn-icon-sm" @click="confirmDeleteStep(step)"
                                            title="删除">🗑️</button>
                                    </div>
                                </div>

                                <h3 class="timeline-card-title">{{ step.title }}</h3>
                                <p v-if="step.description" class="timeline-card-desc">{{ step.description }}</p>

                                <!-- 多图网格 -->
                                <div v-if="stepImgList(step).length" class="step-img-grid"
                                    :class="`grid-${Math.min(3, stepImgList(step).length)}`">
                                    <div v-for="(url, i) in stepImgList(step).slice(0, 3)" :key="i"
                                        class="step-img-cell" @click.stop="openPreview(stepImgList(step), i)">
                                        <img :src="url" alt="" />
                                        <div v-if="i === 2 && stepImgList(step).length > 3" class="img-more-overlay">
                                            +{{ stepImgList(step).length - 3 }}
                                        </div>
                                    </div>
                                </div>

                                <div class="timeline-card-footer">
                                    <!-- 截止日期 -->
                                    <span v-if="step.due_date" class="step-due" :class="{ overdue: isOverdue(step) }">
                                        📅 {{ formatDate(step.due_date) }}
                                    </span>
                                    <span v-if="step.completed_at" class="step-completed-at">
                                        ✅ {{ formatDate(step.completed_at) }}
                                    </span>

                                    <!-- 状态切换 -->
                                    <div class="step-status-group">
                                        <button v-for="s in stepStatuses" :key="s.value" class="step-status-btn"
                                            :class="{ active: step.status === s.value }" :title="s.label"
                                            @click="changeStepStatus(step, s.value)">{{ s.icon }}</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </template>
            </main>
        </div>

        <!-- ── 图片预览 ── -->
        <div v-if="previewState.show" class="img-preview-overlay" @click="previewState.show = false">
            <img :src="previewState.imgs[previewState.index]" class="img-preview" @click.stop />
            <button v-if="previewState.index > 0" class="preview-nav preview-nav--prev"
                @click.stop="previewState.index--">&#8249;</button>
            <button v-if="previewState.index < previewState.imgs.length - 1" class="preview-nav preview-nav--next"
                @click.stop="previewState.index++">&#8250;</button>
            <div class="preview-counter">{{ previewState.index + 1 }} / {{ previewState.imgs.length }}</div>
            <button class="preview-close" @click.stop="previewState.show = false">✕</button>
        </div>

        <!-- ── 计划 Modal ── -->
        <div v-if="showPlanModal" class="modal-overlay" @click.self="showPlanModal = false">
            <div class="modal">
                <div class="modal-header">
                    <h3>{{ editingPlan?.id ? '编辑计划' : '新建计划' }}</h3>
                    <button class="btn btn-ghost btn-icon" @click="showPlanModal = false">✕</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label>图标</label>
                        <div class="emoji-picker">
                            <button v-for="e in planIcons" :key="e" class="emoji-btn"
                                :class="{ active: planForm.icon === e }" @click="planForm.icon = e">{{ e }}</button>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>计划名称 <span class="required">*</span></label>
                        <input v-model="planForm.title" class="form-input" placeholder="给你的计划取个名字" maxlength="100" />
                    </div>
                    <div class="form-group">
                        <label>描述</label>
                        <textarea v-model="planForm.description" class="form-input form-textarea"
                            placeholder="计划的目标或说明（可选）" rows="2" />
                    </div>
                    <div class="form-group">
                        <label>颜色标记</label>
                        <div class="color-picker">
                            <button v-for="c in planColors" :key="c" class="color-dot"
                                :class="{ active: planForm.color === c }" :style="{ background: c }"
                                @click="planForm.color = c"></button>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>状态</label>
                        <div class="status-select">
                            <button v-for="s in planStatuses" :key="s.value" class="status-option"
                                :class="{ active: planForm.status === s.value }" @click="planForm.status = s.value">{{
                                    s.icon }}
                                {{ s.label }}</button>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-ghost" @click="showPlanModal = false">取消</button>
                    <button class="btn btn-primary" :disabled="!planForm.title.trim()" @click="savePlan">
                        {{ editingPlan?.id ? '保存' : '创建' }}
                    </button>
                </div>
            </div>
        </div>

        <!-- ── 步骤 Modal ── -->
        <div v-if="showStepModal" class="modal-overlay" @click.self="showStepModal = false">
            <div class="modal modal-lg">
                <div class="modal-header">
                    <h3>{{ editingStep?.id ? '编辑步骤' : '添加步骤' }}</h3>
                    <button class="btn btn-ghost btn-icon" @click="showStepModal = false">✕</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label>步骤标题 <span class="required">*</span></label>
                        <input v-model="stepForm.title" class="form-input" placeholder="这一步要做什么？" maxlength="200" />
                    </div>
                    <div class="form-group">
                        <label>详细描述</label>
                        <textarea v-model="stepForm.description" class="form-input form-textarea"
                            placeholder="详细说明、思路、资料链接等..." rows="3" />
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label>特殊标识</label>
                            <div class="badge-presets">
                                <button v-for="b in badgePresets" :key="b.label" class="badge-preset-btn"
                                    :class="{ active: stepForm.badge === b.label }" :style="stepForm.badge === b.label
                                        ? { borderColor: b.color, background: b.color, color: '#fff' }
                                        : { borderColor: b.color, color: b.color }"
                                    @click="stepForm.badge = b.label; stepForm.badge_color = b.color">{{ b.label
                                    }}</button>
                                <button class="badge-preset-btn clear-badge"
                                    @click="stepForm.badge = ''; stepForm.badge_color = ''">清除</button>
                            </div>
                            <input v-model="stepForm.badge" class="form-input mt-8" placeholder="或输入自定义标识..."
                                maxlength="20" />
                        </div>

                        <div class="form-group">
                            <label>截止日期</label>
                            <AppDatePicker v-model="stepForm.due_date" placeholder="选择截止日期" />
                        </div>
                    </div>

                    <div class="form-group">
                        <label>状态</label>
                        <div class="status-select">
                            <button v-for="s in stepStatuses" :key="s.value" class="status-option"
                                :class="{ active: stepForm.status === s.value }" @click="stepForm.status = s.value">{{
                                    s.icon }}
                                {{ s.label }}</button>
                        </div>
                    </div>

                    <!-- 多图上传（最多9张） -->
                    <div class="form-group">
                        <label>配图 <span class="form-label-hint">最多9张</span></label>
                        <div class="img-upload-grid">
                            <!-- 已上传完成的图 -->
                            <div v-for="(url, i) in stepForm.image_urls" :key="`done-${i}`" class="img-grid-cell">
                                <img :src="url" alt="" @click="openPreview(stepForm.image_urls, i)" />
                                <button class="img-cell-remove" @click="removeImage(i)">✕</button>
                            </div>
                            <!-- 上传中的占位图 -->
                            <div v-for="item in uploadingItems" :key="item.id" class="img-grid-cell img-grid-uploading">
                                <img :src="item.localUrl" alt="" />
                                <div class="img-cell-mask">
                                    <div class="loading-spinner"></div>
                                </div>
                            </div>
                            <!-- 添加按钮 -->
                            <button v-if="stepForm.image_urls.length + uploadingItems.length < 9" class="img-add-cell"
                                @click="$refs.imgInput.click()">
                                <span>📷</span>
                                <p>添加图片</p>
                            </button>
                        </div>
                        <input ref="imgInput" type="file" accept="image/*" multiple hidden @change="handleImgUpload" />
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-ghost" @click="showStepModal = false">取消</button>
                    <button class="btn btn-primary" :disabled="!stepForm.title.trim() || uploading" @click="saveStep">
                        {{ editingStep?.id ? '保存' : '添加' }}
                    </button>
                </div>
            </div>
        </div>

    </AppLayout>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import AppLayout from '@/components/AppLayout.vue'
import AppDatePicker from '@/components/AppDatePicker.vue'
import { usePlanStore } from '@/stores/plans'
import { uploadApi } from '@/api'
import { toast } from '@/utils/toast'
import { showConfirm } from '@/utils/alert'
import dayjs from 'dayjs'

const planStore = usePlanStore()

// ── 常量 ────────────────────────────────────────────────────────
const planFilters = [
    { label: '全部', value: '' },
    { label: '进行中', value: 'active' },
    { label: '已完成', value: 'completed' },
    { label: '已暂停', value: 'paused' }
]
const planStatuses = [
    { value: 'active', label: '进行中', icon: '🚀' },
    { value: 'paused', label: '已暂停', icon: '⏸️' },
    { value: 'completed', label: '已完成', icon: '✅' }
]
const stepStatuses = [
    { value: 'pending', label: '待开始', icon: '⬜' },
    { value: 'in_progress', label: '进行中', icon: '🔄' },
    { value: 'completed', label: '已完成', icon: '✅' },
    { value: 'skipped', label: '已跳过', icon: '⏭️' }
]
const stepStatusIcon = { pending: '⬜', in_progress: '🔄', completed: '✅', skipped: '⏭️' }
const statusLabel = { active: '进行中', paused: '已暂停', completed: '已完成' }
const planColors = ['#FFFFFF', '#FFD6E0', '#D4F5E9', '#E4E8F8', '#FFE8D6', '#FFF8D6', '#D6EEFF', '#DCEDC8']
const planIcons = ['🎯', '🚀', '💡', '📚', '💪', '🌱', '✨', '🏆', '🎨', '🔬', '🌍', '❤️']
const badgePresets = [
    { label: '里程碑', color: '#FF85A1' },
    { label: '重要', color: '#FF7675' },
    { label: '关键', color: '#e17055' },
    { label: '可选', color: '#74b9ff' },
    { label: '待定', color: '#b2bec3' }
]

// ── 状态 ────────────────────────────────────────────────────────
const activeFilter = ref('')
const currentPlanId = ref(null)
const showPlanModal = ref(false)
const showStepModal = ref(false)
const editingPlan = ref(null)
const editingStep = ref(null)
const previewState = ref({ show: false, imgs: [], index: 0 })
const uploadingItems = ref([]) // [{ id, localUrl }]
const uploading = computed(() => uploadingItems.value.length > 0)

const planForm = ref({ title: '', description: '', color: '#FFFFFF', icon: '🎯', status: 'active' })
const stepForm = ref({ title: '', description: '', status: 'pending', badge: '', badge_color: '', image_urls: [], due_date: '' })

// ── 计算 ────────────────────────────────────────────────────────
const filteredPlans = computed(() =>
    activeFilter.value
        ? planStore.plans.filter(p => p.status === activeFilter.value)
        : planStore.plans
)

// ── 生命周期 ────────────────────────────────────────────────────
onMounted(() => planStore.fetchPlans())

// ── 方法 ────────────────────────────────────────────────────────
function progressPct(plan) {
    if (!plan.total_steps || plan.total_steps === 0) return 0
    return Math.round((plan.done_steps / plan.total_steps) * 100)
}

function formatDate(d) {
    return dayjs(d).format('YYYY-MM-DD')
}

function isOverdue(step) {
    return step.due_date && step.status !== 'completed' && dayjs(step.due_date).isBefore(dayjs(), 'day')
}

function badgeStyle(step) {
    if (step.badge_color) return { background: step.badge_color + '22', color: step.badge_color, borderColor: step.badge_color }
    return {}
}

async function selectPlan(id) {
    currentPlanId.value = id
    await planStore.fetchPlan(id)
}

// 计划 Modal
function openPlanModal(plan = null) {
    editingPlan.value = plan
    planForm.value = plan
        ? { title: plan.title, description: plan.description, color: plan.color, icon: plan.icon, status: plan.status }
        : { title: '', description: '', color: '#FFFFFF', icon: '🎯', status: 'active' }
    showPlanModal.value = true
}

async function savePlan() {
    if (!planForm.value.title.trim()) return
    try {
        if (editingPlan.value?.id) {
            await planStore.updatePlan(editingPlan.value.id, planForm.value)
            toast.success('计划已更新 ✨')
        } else {
            const res = await planStore.createPlan(planForm.value)
            toast.success('计划已创建 🎯')
            await selectPlan(res.data.id)
        }
        showPlanModal.value = false
    } catch (e) {
        toast.error(e.message)
    }
}

async function confirmDeletePlan(plan) {
    const ok = await showConfirm(`确定删除计划「${plan.title}」及其所有步骤吗？`, {
        title: '删除计划',
        icon: '🗑️',
        confirmText: '删除',
        variant: 'danger',
    })
    if (!ok) return
    try {
        await planStore.deletePlan(plan.id)
        if (currentPlanId.value === plan.id) currentPlanId.value = null
        toast.success('计划已删除')
    } catch (e) {
        toast.error(e.message)
    }
}

// 步骤 Modal
function openStepModal(step = null) {
    editingStep.value = step
    uploadingItems.value = []
    const imgs = step ? (Array.isArray(step.image_urls) && step.image_urls.length
        ? [...step.image_urls]
        : (step.image_url ? [step.image_url] : [])) : []
    stepForm.value = step
        ? {
            title: step.title, description: step.description, status: step.status,
            badge: step.badge, badge_color: step.badge_color,
            image_urls: imgs,
            due_date: step.due_date ? formatDate(step.due_date) : ''
        }
        : { title: '', description: '', status: 'pending', badge: '', badge_color: '', image_urls: [], due_date: '' }
    showStepModal.value = true
}

async function saveStep() {
    if (!stepForm.value.title.trim()) return
    try {
        if (editingStep.value?.id) {
            await planStore.updateStep(editingStep.value.id, stepForm.value)
            toast.success('步骤已更新 ✨')
        } else {
            await planStore.createStep({ plan_id: currentPlanId.value, ...stepForm.value })
            toast.success('步骤已添加 🌸')
        }
        showStepModal.value = false
    } catch (e) {
        toast.error(e.message)
    }
}

async function changeStepStatus(step, status) {
    try {
        await planStore.updateStep(step.id, { status })
    } catch (e) {
        toast.error(e.message)
    }
}

async function confirmDeleteStep(step) {
    const ok = await showConfirm(`确定删除步骤「${step.title}」吗？`, {
        title: '删除步骤',
        icon: '🗑️',
        confirmText: '删除',
        variant: 'danger',
    })
    if (!ok) return
    try {
        await planStore.deleteStep(step.id)
        toast.success('步骤已删除')
    } catch (e) {
        toast.error(e.message)
    }
}

async function moveStep(idx, dir) {
    const steps = planStore.currentPlan.steps
    const target = idx + dir
    if (target < 0 || target >= steps.length) return
        ;[steps[idx], steps[target]] = [steps[target], steps[idx]]
    const items = steps.map((s, i) => ({ id: s.id, sort_order: i }))
    await planStore.reorderSteps(items)
}

/** 用 Canvas 将图片压缩到 50% 画质后返回 Blob */
function compressImage(file, quality = 0.5) {
    return new Promise((resolve) => {
        const img = new Image()
        const url = URL.createObjectURL(file)
        img.onload = () => {
            const canvas = document.createElement('canvas')
            canvas.width = img.naturalWidth
            canvas.height = img.naturalHeight
            canvas.getContext('2d').drawImage(img, 0, 0)
            URL.revokeObjectURL(url)
            const mime = file.type === 'image/png' ? 'image/jpeg' : (file.type || 'image/jpeg')
            canvas.toBlob((blob) => resolve(blob), mime, quality)
        }
        img.src = url
    })
}

/** 打开图片预览轮播 */
function openPreview(imgs, index = 0) {
    previewState.value = { show: true, imgs: [...imgs], index }
}

/** 删除已上传图片 */
function removeImage(i) {
    stepForm.value.image_urls.splice(i, 1)
}

/** 从 step 对象取多图列表（兼容旧 image_url 单图字段） */
function stepImgList(step) {
    if (Array.isArray(step.image_urls) && step.image_urls.length) return step.image_urls
    if (step.image_url) return [step.image_url]
    return []
}

async function handleImgUpload(e) {
    const files = Array.from(e.target.files)
    const remainSlots = 9 - stepForm.value.image_urls.length - uploadingItems.value.length
    const toProcess = files.slice(0, remainSlots)
    if (!toProcess.length) { e.target.value = ''; return }

    for (const file of toProcess) {
        const localUrl = URL.createObjectURL(file)
        const itemId = `${Date.now()}-${Math.random()}`
        uploadingItems.value.push({ id: itemId, localUrl })

        compressImage(file, 0.5).then(async (compressed) => {
            try {
                const ext = file.type === 'image/png' ? '.jpg' : (file.name.match(/\.[^.]+$/)?.[0] ?? '.jpg')
                const compressedFile = new File([compressed], file.name.replace(/\.[^.]+$/, ext), { type: compressed.type })
                const res = await uploadApi.image(compressedFile)
                stepForm.value.image_urls.push(res.data?.url || res.url)
            } catch {
                toast.error('图片上传失败')
            } finally {
                URL.revokeObjectURL(localUrl)
                uploadingItems.value = uploadingItems.value.filter(it => it.id !== itemId)
            }
        })
    }
    e.target.value = ''
}
</script>

<style scoped>
/* ── 页面布局 ── */
.plans-page {
    display: flex;
    height: 100%;
    min-height: calc(100vh - 60px);
    gap: 0;
}

/* ── 左侧 Sidebar ── */
.plans-sidebar {
    width: 300px;
    min-width: 260px;
    border-right: 1px solid var(--color-border);
    background: var(--color-surface);
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    padding: 20px 16px;
    gap: 12px;
    scrollbar-width: none;
}

.plans-sidebar::-webkit-scrollbar {
    display: none;
}

.plans-sidebar-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.sidebar-title {
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--color-text);
}

.plan-filters {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
}

/* ── 计划卡片 ── */
.plan-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.plan-card {
    border: 1.5px solid var(--color-border);
    border-left: 4px solid var(--theme-primary);
    border-radius: var(--radius-md);
    padding: 12px;
    cursor: pointer;
    transition: all var(--transition);
    background: var(--color-surface);
}

.plan-card:hover {
    box-shadow: var(--shadow-md);
    transform: translateY(-1px);
}

.plan-card.active {
    background: var(--theme-primary-light);
    border-color: var(--theme-primary-dark);
}

.plan-card-top {
    display: flex;
    gap: 8px;
    align-items: flex-start;
}

.plan-card-icon {
    font-size: 1.4rem;
    flex-shrink: 0;
}

.plan-card-info {
    flex: 1;
    min-width: 0;
}

.plan-card-title {
    font-weight: 600;
    font-size: 0.9rem;
    color: var(--color-text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.plan-card-desc {
    font-size: 0.75rem;
    color: var(--color-text-secondary);
    margin-top: 2px;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

.plan-card-actions {
    display: flex;
    gap: 2px;
    opacity: 0;
    transition: opacity var(--transition);
}

.plan-card:hover .plan-card-actions {
    opacity: 1;
}

.plan-card-bottom {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 10px;
}

.plan-status-badge {
    font-size: 0.7rem;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: var(--radius-full);
    white-space: nowrap;
}

.status-active {
    background: #d4f5e9;
    color: #27ae60;
}

.status-completed {
    background: var(--theme-primary-light);
    color: var(--theme-primary-dark);
}

.status-paused {
    background: #ffeaa7;
    color: #e17055;
}

.plan-progress-wrap {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 6px;
}

.plan-progress-bar {
    flex: 1;
    height: 5px;
    background: var(--color-border);
    border-radius: var(--radius-full);
    overflow: hidden;
}

.plan-progress-fill {
    height: 100%;
    background: var(--theme-primary-dark);
    border-radius: var(--radius-full);
    transition: width 0.3s ease;
}

.plan-progress-text {
    font-size: 0.7rem;
    color: var(--color-text-secondary);
    white-space: nowrap;
}

.plans-empty {
    text-align: center;
    padding: 40px 0;
    color: var(--color-text-secondary);
    font-size: 0.9rem;
}

.plans-empty span {
    font-size: 2rem;
    display: block;
    margin-bottom: 8px;
}

/* ── 右侧主区域 ── */
.plans-main {
    flex: 1;
    padding: 24px;
    overflow-y: auto;
    min-width: 0;
    scrollbar-width: none;
}

.plans-main::-webkit-scrollbar {
    display: none;
}

.timeline-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 300px;
    color: var(--color-text-secondary);
    text-align: center;
    gap: 12px;
}

.timeline-empty-icon {
    font-size: 3rem;
}

.timeline-empty h3 {
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--color-text);
}

/* ── 时间线顶部信息 ── */
.timeline-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 28px;
    gap: 16px;
}

.timeline-header-left {
    display: flex;
    align-items: flex-start;
    gap: 12px;
}

.timeline-plan-icon {
    font-size: 2rem;
    flex-shrink: 0;
}

.timeline-plan-title {
    font-size: 1.3rem;
    font-weight: 700;
    color: var(--color-text);
}

.timeline-plan-desc {
    font-size: 0.85rem;
    color: var(--color-text-secondary);
    margin-top: 4px;
}

/* ── 时间线 ── */
.timeline {
    display: flex;
    flex-direction: column;
    gap: 0;
}

.timeline-item {
    display: flex;
    gap: 16px;
    position: relative;
}

.timeline-line {
    display: flex;
    flex-direction: column;
    align-items: center;
    flex-shrink: 0;
    width: 36px;
}

.timeline-dot {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1rem;
    border: 2px solid var(--color-border);
    background: var(--color-surface);
    flex-shrink: 0;
    z-index: 1;
    transition: all var(--transition);
}

.dot-pending {
    border-color: var(--color-border);
    background: var(--color-bg);
}

.dot-in_progress {
    border-color: #74b9ff;
    background: #d6eeff;
}

.dot-completed {
    border-color: var(--theme-primary-dark);
    background: var(--theme-primary-light);
}

.dot-skipped {
    border-color: var(--color-text-light);
    background: #f0f0f0;
}

.timeline-connector {
    width: 2px;
    flex: 1;
    min-height: 20px;
    background: var(--color-border);
    margin: 4px 0;
}

/* ── 步骤卡片 ── */
.timeline-card {
    flex: 1;
    min-width: 0;
    border: 1.5px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: 16px;
    margin-bottom: 16px;
    background: var(--color-surface);
    transition: box-shadow var(--transition);
}

.timeline-card:hover {
    box-shadow: var(--shadow-md);
}

.step-completed .timeline-card {
    opacity: 0.75;
}

.step-skipped .timeline-card {
    opacity: 0.55;
}

.timeline-card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 6px;
}

.timeline-card-title-row {
    display: flex;
    align-items: center;
    gap: 8px;
}

.timeline-step-num {
    font-size: 0.72rem;
    color: var(--color-text-secondary);
    font-weight: 500;
}

.step-badge {
    font-size: 0.7rem;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: var(--radius-full);
    border: 1.5px solid var(--theme-primary-dark);
    color: var(--theme-primary-dark);
    background: var(--theme-primary-light);
}

.timeline-card-actions {
    display: flex;
    gap: 2px;
    opacity: 0;
    transition: opacity var(--transition);
}

.timeline-card:hover .timeline-card-actions {
    opacity: 1;
}

.timeline-card-title {
    font-size: 1rem;
    font-weight: 600;
    color: var(--color-text);
    margin-bottom: 6px;
}

.timeline-card-desc {
    font-size: 0.85rem;
    color: var(--color-text-secondary);
    line-height: 1.6;
    margin-bottom: 10px;
    white-space: pre-wrap;
}

/* ── 时间线卡片多图网格 ── */
.step-img-grid {
    display: grid;
    gap: 3px;
    border-radius: var(--radius-sm);
    overflow: hidden;
    margin-bottom: 10px;
    cursor: zoom-in;
}

.step-img-grid.grid-1,
.step-img-grid.grid-2,
.step-img-grid.grid-3 {
    grid-template-columns: repeat(3, 1fr);
}

.step-img-cell {
    position: relative;
    aspect-ratio: 1;
    width: auto;
    height: auto;
    overflow: hidden;
    background: var(--color-border);
}

.step-img-cell img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    transition: transform var(--transition);
}

.step-img-cell:hover img {
    transform: scale(1.04);
}

/* QQ 空间风格的 +N 遮罩 */
.img-more-overlay {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.52);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.6rem;
    font-weight: 800;
    color: #fff;
    letter-spacing: -1px;
}

.timeline-card-footer {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    margin-top: 8px;
}

.step-due {
    font-size: 0.75rem;
    color: var(--color-text-secondary);
}

.step-due.overdue {
    color: #e17055;
    font-weight: 600;
}

.step-completed-at {
    font-size: 0.75rem;
    color: #27ae60;
}

.step-status-group {
    margin-left: auto;
    display: flex;
    gap: 4px;
}

.step-status-btn {
    width: 28px;
    height: 28px;
    border-radius: var(--radius-sm);
    font-size: 0.85rem;
    cursor: pointer;
    border: 1.5px solid transparent;
    background: var(--color-bg);
    transition: all var(--transition);
}

.step-status-btn:hover {
    border-color: var(--theme-primary);
}

.step-status-btn.active {
    border-color: var(--theme-primary-dark);
    background: var(--theme-primary-light);
}

/* ── 按钮尺寸 ── */
.btn-sm {
    padding: 6px 14px;
    font-size: 0.82rem;
}

.btn-icon-sm {
    width: 28px;
    height: 28px;
    padding: 0;
    font-size: 0.85rem;
    border-radius: var(--radius-sm);
}

/* ── Modal ── */
.modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.35);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 16px;
}

.modal {
    background: var(--color-surface);
    border-radius: var(--radius-lg);
    width: 100%;
    max-width: 460px;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: var(--shadow-lg);
    scrollbar-width: none;
}

.modal::-webkit-scrollbar {
    display: none;
}

.modal-lg {
    max-width: 560px;
}

.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px 20px 0;
}

.modal-header h3 {
    font-size: 1.05rem;
    font-weight: 700;
    color: var(--color-text);
}

.modal-body {
    padding: 16px 20px;
    display: flex;
    flex-direction: column;
    gap: 14px;
}

.modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    padding: 0 20px 20px;
}

/* ── 表单 ── */
.form-group label {
    font-size: 0.82rem;
    font-weight: 600;
    color: var(--color-text-secondary);
}

.required {
    color: var(--theme-primary-dark);
}

.form-input {
    width: 100%;
    padding: 10px 12px;
    border: 1.5px solid var(--color-border);
    border-radius: var(--radius-sm);
    background: var(--color-bg);
    color: var(--color-text);
    font-size: 0.9rem;
    font-family: inherit;
    transition: border-color var(--transition);
}

.form-input:focus {
    outline: none;
    border-color: var(--theme-primary-dark);
}

.form-textarea {
    resize: vertical;
    min-height: 72px;
}

.form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
}

.mt-8 {
    margin-top: 8px;
}

/* Emoji Picker */
.emoji-picker {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
}

.emoji-btn {
    width: 36px;
    height: 36px;
    font-size: 1.2rem;
    border-radius: var(--radius-sm);
    background: var(--color-bg);
    border: 1.5px solid transparent;
    cursor: pointer;
    transition: all var(--transition);
}

.emoji-btn:hover {
    border-color: var(--theme-primary);
}

.emoji-btn.active {
    border-color: var(--theme-primary-dark);
    background: var(--theme-primary-light);
}

/* Color Picker */
.color-picker {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
}

.color-dot {
    width: 26px;
    height: 26px;
    border-radius: 50%;
    border: 2.5px solid transparent;
    cursor: pointer;
    transition: all var(--transition);
}

.color-dot:hover {
    transform: scale(1.15);
}

.color-dot.active {
    border-color: var(--theme-primary-dark);
    transform: scale(1.15);
}

/* Status Select */
.status-select {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
}

.status-option {
    padding: 6px 12px;
    border-radius: var(--radius-full);
    font-size: 0.82rem;
    cursor: pointer;
    border: 1.5px solid var(--color-border);
    background: var(--color-bg);
    transition: all var(--transition);
}

.status-option:hover {
    border-color: var(--theme-primary);
}

.status-option.active {
    border-color: var(--theme-primary-dark);
    background: var(--theme-primary-light);
    font-weight: 600;
}

/* Badge Presets */
.badge-presets {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
}

.badge-preset-btn {
    padding: 4px 10px;
    border-radius: var(--radius-full);
    font-size: 0.78rem;
    font-weight: 600;
    cursor: pointer;
    border: 1.5px solid var(--color-border);
    background: var(--color-bg);
    transition: all var(--transition);
}

.badge-preset-btn.active {
    font-weight: 700;
}

.clear-badge {
    color: var(--color-text-secondary);
}

.form-label-hint {
    font-size: 0.72rem;
    font-weight: 400;
    color: var(--color-text-light);
    margin-left: 4px;
}

/* ── 多图上传网格 ── */
.img-upload-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 6px;
}

.img-grid-cell {
    position: relative;
    aspect-ratio: 1;
    border-radius: var(--radius-sm);
    overflow: hidden;
    background: var(--color-border);
}

.img-grid-cell img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    cursor: zoom-in;
}

.img-grid-uploading {
    opacity: 0.65;
}

.img-cell-mask {
    position: absolute;
    inset: 0;
    background: rgba(255, 255, 255, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    backdrop-filter: blur(2px);
}

.img-cell-remove {
    position: absolute;
    top: 3px;
    right: 3px;
    width: 18px;
    height: 18px;
    background: rgba(0, 0, 0, 0.55);
    color: white;
    border-radius: 50%;
    font-size: 10px;
    cursor: pointer;
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
}

.img-add-cell {
    aspect-ratio: 1;
    border: 2px dashed var(--color-border);
    border-radius: var(--radius-sm);
    background: none;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    color: var(--color-text-secondary);
    font-size: 0.72rem;
    font-family: inherit;
    transition: border-color var(--transition), color var(--transition);
}

.img-add-cell span {
    font-size: 1.4rem;
}

.img-add-cell:hover {
    border-color: var(--theme-primary-dark);
    color: var(--theme-primary-dark);
}

/* ── 图片预览轮播 ── */
.img-preview-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.92);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2000;
    padding: 20px;
}

.img-preview {
    max-width: min(90vw, 900px);
    max-height: 85vh;
    object-fit: contain;
    border-radius: var(--radius-md);
    user-select: none;
}

.preview-nav {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    background: rgba(255, 255, 255, 0.18);
    border: none;
    color: white;
    font-size: 2.2rem;
    width: 48px;
    height: 72px;
    cursor: pointer;
    border-radius: var(--radius-sm);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background var(--transition);
    line-height: 1;
}

.preview-nav:hover {
    background: rgba(255, 255, 255, 0.32);
}

.preview-nav--prev {
    left: 12px;
}

.preview-nav--next {
    right: 12px;
}

.preview-counter {
    position: absolute;
    bottom: 16px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.5);
    color: white;
    font-size: 13px;
    padding: 4px 16px;
    border-radius: var(--radius-full);
    pointer-events: none;
}

.preview-close {
    position: absolute;
    top: 12px;
    right: 16px;
    background: rgba(255, 255, 255, 0.18);
    border: none;
    color: white;
    font-size: 1rem;
    width: 36px;
    height: 36px;
    cursor: pointer;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background var(--transition);
}

.preview-close:hover {
    background: rgba(255, 255, 255, 0.32);
}

/* ── 响应式：移动端 ── */
@media (max-width: 768px) {
    .plans-page {
        flex-direction: column;
        height: auto;
    }

    .plans-sidebar {
        width: 100%;
        min-width: unset;
        border-right: none;
        border-bottom: 1px solid var(--color-border);
        max-height: 320px;
        padding: 16px;
    }

    .sidebar-title {
        font-size: 1rem;
    }

    .plans-main {
        padding: 16px;
    }

    .timeline-header {
        flex-direction: column;
        gap: 12px;
    }

    .form-row {
        grid-template-columns: 1fr;
    }

    .timeline-card-actions {
        opacity: 1;
    }

    .plan-card-actions {
        opacity: 1;
    }
}
</style>
