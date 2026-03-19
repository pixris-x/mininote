<template>
    <div class="share-page">
        <!-- 加载中 -->
        <div v-if="loading" class="share-loading">
            <div class="loading-spinner"></div>
            <p>加载中...</p>
        </div>

        <!-- 错误 -->
        <div v-else-if="error" class="share-error">
            <CircleAlert class="share-error-icon" :size="52" />
            <h2>{{ errorMsg || '链接无效或已失效' }}</h2>
            <p>此分享链接可能已被撤销、已过期或不存在。</p>
        </div>

        <!-- PIN 验证屏 -->
        <div v-else-if="needsPin && !pinVerified" class="share-pin-screen">
            <div class="share-pin-card">
                <Lock class="share-pin-screen-icon" :size="48" />
                <h2>需要访问码</h2>
                <p class="share-pin-meta" v-if="meta">
                    <component :is="getPlanIconComponentOrDefault(meta.icon)" class="share-meta-icon-svg" />
                    {{ meta.title }} · 由 {{ meta.authorName }} 分享
                </p>
                <div class="pin-boxes">
                    <input v-for="i in 4" :key="i" :ref="el => { if (el) pinRefs[i - 1] = el }" type="text"
                        inputmode="numeric" maxlength="1" v-model="pinDigits[i - 1]"
                        :class="{ 'pin-box-error': pinError }" @input="onPinInput(i - 1, $event)"
                        @keydown="onPinKeydown($event, i - 1)" @paste.prevent="onPinPaste($event)" />
                </div>
                <p v-if="pinError" class="pin-error">{{ pinError }}</p>
                <button class="pin-submit-btn" :disabled="pinLoading || pinInput.length !== 4" @click="verifyPin">
                    {{ pinLoading ? '验证中...' : '确认访问' }}
                </button>
            </div>
        </div>

        <!-- 计划内容 -->
        <template v-else-if="plan">
            <header class="share-header">
                <div class="share-brand">
                    <Flower2 class="share-brand-logo" :size="20" />
                    <span class="share-brand-name">Mini Note</span>
                </div>
                <div class="share-plan-meta">
                    <span class="share-author">由 {{ plan.author_name }} 分享</span>
                </div>
                <button v-if="userStore.isLoggedIn" class="share-import-btn" :disabled="importing || importDone"
                    @click="importPlan">
                    <component :is="importBtnIcon" class="share-import-icon" :class="{ spinning: importing }" :size="14" />
                    <span>{{ importDone ? '已导入' : importing ? '导入中…' : '导入到我的行程' }}</span>
                </button>
            </header>

            <main class="share-main">
                <div class="share-plan-header">
                    <span class="share-plan-icon">
                        <component :is="getPlanIconComponentOrDefault(plan.icon)" class="share-plan-icon-svg" />
                    </span>
                    <div>
                        <h1 class="share-plan-title">{{ plan.title }}</h1>
                        <p v-if="plan.description" class="share-plan-desc">{{ plan.description }}</p>
                    </div>
                    <div class="share-plan-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" :style="{ width: progressPct + '%' }"></div>
                        </div>
                        <span class="progress-text">{{ doneCnt }} / {{ plan.steps.length }} 完成</span>
                    </div>
                </div>

                <!-- 空步骤 -->
                <div v-if="!plan.steps.length" class="share-empty">
                    <ListTodo class="share-empty-icon" :size="34" />
                    <p>这个计划暂时还没有步骤</p>
                </div>

                <!-- 步骤时间轴 -->
                <div class="share-timeline">
                    <div v-for="step in plan.steps" :key="step.id"
                        :class="['share-step', `step-status-${step.status}`]">
                        <div class="share-step-dot dot-clickable"
                            :title="step.status === 'completed' ? '点击取消完成' : '点击标记完成'"
                            :class="{ toggling: togglingId === step.id }" @click="toggleStep(step)">
                            <component :is="statusIcon(step.status)" :size="14" :class="{ 'share-status-spinning': step.status === 'in_progress' }" />
                        </div>
                        <div class="share-step-card">
                            <div class="share-step-head">
                                <span class="share-step-title">{{ step.title }}</span>
                                <span v-if="step.badge" class="share-step-badge" :style="badgeStyle(step)">{{ step.badge
                                }}</span>
                            </div>
                            <p v-if="step.description" class="share-step-desc">{{ step.description }}</p>

                            <!-- 日期 -->
                            <div class="share-step-dates">
                                <span v-if="step.start_date" class="share-step-date">
                                    <CalendarDays class="share-inline-icon" :size="13" />开始：{{ formatDate(step.start_date) }}
                                </span>
                                <span v-if="step.due_date" class="share-step-date"
                                    :class="{ overdue: isOverdue(step) }">
                                    <CalendarClock class="share-inline-icon" :size="13" />截止：{{ formatDate(step.due_date) }}
                                </span>
                            </div>

                            <!-- 地点 + 地图 -->
                            <div v-if="step.location" class="share-step-location">
                                <span class="share-step-location-text"><MapPin class="share-inline-icon" :size="13" />{{ step.location }}</span>
                                <div class="share-map-btns">
                                    <a :href="`https://uri.amap.com/search?keyword=${encodeURIComponent(step.location)}&src=mini-note&callnative=1`"
                                        target="_blank" rel="noopener noreferrer"
                                        class="share-map-btn share-map-btn--amap">高德</a>
                                    <a :href="`http://api.map.baidu.com/geocoder?address=${encodeURIComponent(step.location)}&output=html&src=mini-note`"
                                        target="_blank" rel="noopener noreferrer"
                                        class="share-map-btn share-map-btn--baidu">百度</a>
                                    <a :href="`https://apis.map.qq.com/uri/v1/search?keyword=${encodeURIComponent(step.location)}&referer=mini-note`"
                                        target="_blank" rel="noopener noreferrer"
                                        class="share-map-btn share-map-btn--tencent">腾讯</a>
                                </div>
                            </div>

                            <!-- 图片 -->
                            <div v-if="imgList(step).length" class="share-step-imgs">
                                <div v-for="(url, i) in imgList(step)" :key="i" class="share-img-cell"
                                    @click="openPreview(imgList(step), i)">
                                    <img :src="url" alt="" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 全部完成庆祝横幅 -->
                <div v-if="plan.steps?.length && doneCnt >= plan.steps.length" class="share-all-done-banner">
                    <Sparkles :size="16" />所有步骤已完成！超棒！
                </div>
            </main>
        </template>

        <!-- 图片预览 -->
        <div v-if="preview.show" class="img-preview-overlay" @click="preview.show = false"
            @touchstart.passive="onPreviewTouchStart" @touchend.passive="onPreviewTouchEnd">
            <img :src="preview.imgs[preview.index]" class="img-preview" @click.stop />
            <!-- 左翻页区 -->
            <div v-if="preview.index > 0" class="preview-zone preview-zone--prev" @click.stop="preview.index--">
                <span class="preview-zone-arrow"><ChevronLeft :size="22" /></span>
            </div>
            <!-- 右翻页区 -->
            <div v-if="preview.index < preview.imgs.length - 1" class="preview-zone preview-zone--next"
                @click.stop="preview.index++">
                <span class="preview-zone-arrow"><ChevronRight :size="22" /></span>
            </div>
            <!-- 关闭按鈕 -->
            <button class="preview-close" @click.stop="preview.show = false"><X :size="18" /></button>
            <!-- 计数 -->
            <div v-if="preview.imgs.length > 1" class="preview-counter">{{ preview.index + 1 }} / {{ preview.imgs.length
            }}
            </div>
        </div>

        <!-- 返回顶部 -->
        <Transition name="back-top-fade">
            <button v-if="showBackToTop" class="share-back-to-top" @click="scrollToTop" title="返回顶部">
                <ArrowUp :size="20" />
            </button>
        </Transition>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import axios from 'axios'
import dayjs from 'dayjs'
import { planApi } from '@/api'
import { useUserStore } from '@/stores/user'
import { toast } from '@/utils/toast'
import { getPlanIconComponentOrDefault } from '@/utils/plan-icons'
import {
    ArrowUp,
    CalendarClock,
    CalendarDays,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Circle,
    CircleAlert,
    Download,
    Flower2,
    ListTodo,
    LoaderCircle,
    Lock,
    MapPin,
    SkipForward,
    Sparkles,
    X
} from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const loading = ref(true)
const error = ref(false)
const errorMsg = ref('')
const plan = ref(null)
const preview = ref({ show: false, imgs: [], index: 0 })
const togglingId = ref(null)

// 导入状态
const importing = ref(false)
const importDone = ref(false)
const verifiedPin = ref('')

// PIN 验证
const meta = ref(null)
const needsPin = ref(true)
const pinVerified = ref(false)
const pinDigits = ref(['', '', '', ''])
const pinRefs = []
const pinInput = computed(() => pinDigits.value.join(''))
const pinError = ref('')
const pinLoading = ref(false)
const EXPIRED_MSG = '分享链接已过期'
const importBtnIcon = computed(() => {
    if (importDone.value) return CheckCircle2
    if (importing.value) return LoaderCircle
    return Download
})

function isExpiredError(e) {
    const status = e.response?.status
    const data = e.response?.data || {}
    return status === 410 || data.expired === true || data.message === EXPIRED_MSG || data.message === 'EXPIRED'
}

function onPinInput(index, e) {
    const val = e.target.value.replace(/\D/g, '')
    pinDigits.value[index] = val.slice(-1)
    if (val && index < 3) pinRefs[index + 1]?.focus()
}

function onPinKeydown(e, index) {
    if (e.key === 'Backspace' && !pinDigits.value[index] && index > 0) {
        pinDigits.value[index - 1] = ''
        pinRefs[index - 1]?.focus()
    }
    if (e.key === 'Enter') verifyPin()
}

function onPinPaste(e) {
    const text = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '').slice(0, 4)
    text.split('').forEach((ch, i) => { pinDigits.value[i] = ch })
    pinRefs[Math.min(text.length, 3)]?.focus()
}

function statusIcon(status) {
    if (status === 'completed') return CheckCircle2
    if (status === 'in_progress') return LoaderCircle
    if (status === 'skipped') return SkipForward
    return Circle
}

const progressPct = computed(() => {
    if (!plan.value?.steps?.length) return 0
    return Math.round((doneCnt.value / plan.value.steps.length) * 100)
})
const doneCnt = computed(() =>
    plan.value?.steps?.filter(s => s.status === 'completed').length ?? 0
)

function formatDate(d) {
    return dayjs(d).format('YYYY-MM-DD')
}

function isOverdue(step) {
    return step.due_date && step.status !== 'completed' && dayjs(step.due_date).isBefore(dayjs(), 'day')
}

function badgeStyle(step) {
    if (step.badge_color) return {
        background: step.badge_color + '22',
        color: step.badge_color,
        borderColor: step.badge_color
    }
    return {}
}

function imgList(step) {
    if (Array.isArray(step.image_urls) && step.image_urls.length) return step.image_urls
    if (step.image_url) return [step.image_url]
    return []
}

function openPreview(imgs, index) {
    preview.value = { show: true, imgs, index }
}

async function toggleStep(step) {
    if (togglingId.value) return
    const newStatus = step.status === 'completed' ? 'pending' : 'completed'
    togglingId.value = step.id
    try {
        await axios.patch(`/api/share/${route.params.token}/steps/${step.id}/status`, {
            status: newStatus,
            pin: verifiedPin.value
        })
        step.status = newStatus
    } catch (e) {
        toast.error(isExpiredError(e) ? EXPIRED_MSG : (e.response?.data?.message || '操作失败，请重试'))
    } finally {
        togglingId.value = null
    }
}

async function verifyPin() {
    if (pinInput.value.length !== 4 || pinLoading.value) return
    pinError.value = ''
    pinLoading.value = true
    try {
        const res = await axios.post(`/api/share/${route.params.token}/verify`, { pin: pinInput.value })
        plan.value = res.data.data
        pinVerified.value = true
        verifiedPin.value = pinInput.value
    } catch (e) {
        pinError.value = isExpiredError(e) ? EXPIRED_MSG : '访问码错误，请重试'
        pinDigits.value = ['', '', '', '']
        pinRefs[0]?.focus()
    } finally {
        pinLoading.value = false
    }
}

const showBackToTop = ref(false)
function handleShareScroll() { showBackToTop.value = window.scrollY > 300 }
function scrollToTop() { window.scrollTo({ top: 0, behavior: 'smooth' }) }

// ── 导入分享行程 ──────────────────────────────────────────────────────────
async function importPlan() {
    if (!userStore.isLoggedIn) {
        router.push('/login')
        return
    }
    if (importing.value || importDone.value) return
    importing.value = true
    try {
        const res = await planApi.importShare({
            token: route.params.token,
            pin: verifiedPin.value
        })
        importDone.value = true
        toast.success(`已成功导入「${res.data.title}」到我的行程`)
        setTimeout(() => router.push('/plans'), 1200)
    } catch (e) {
        toast.error(e.message || '导入失败，请重试')
    } finally {
        importing.value = false
    }
}

// 图片预览滑动
let _touchX = 0
function onPreviewTouchStart(e) { _touchX = e.touches[0].clientX }
function onPreviewTouchEnd(e) {
    const dx = e.changedTouches[0].clientX - _touchX
    if (Math.abs(dx) < 50) return
    if (dx < 0 && preview.value.index < preview.value.imgs.length - 1) preview.value.index++
    if (dx > 0 && preview.value.index > 0) preview.value.index--
}

onMounted(async () => {
    window.addEventListener('scroll', handleShareScroll, { passive: true })
    try {
        const res = await axios.get(`/api/share/${route.params.token}`)
        const data = res.data.data
        meta.value = data
        needsPin.value = true
        loading.value = false
    } catch (e) {
        if (isExpiredError(e)) errorMsg.value = EXPIRED_MSG
        else errorMsg.value = e.response?.data?.message || ''
        error.value = true
        loading.value = false
    }
})

onUnmounted(() => {
    window.removeEventListener('scroll', handleShareScroll)
})
</script>

<style scoped lang="scss" src="@/assets/styles/ShareView.scss"></style>
