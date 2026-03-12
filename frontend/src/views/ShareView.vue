<template>
    <div class="share-page">
        <!-- 加载中 -->
        <div v-if="loading" class="share-loading">
            <div class="loading-spinner"></div>
            <p>加载中...</p>
        </div>

        <!-- 错误 -->
        <div v-else-if="error" class="share-error">
            <span class="share-error-icon">😕</span>
            <h2>{{ errorMsg || '链接无效或已失效' }}</h2>
            <p>此分享链接可能已被撤销、已过期或不存在。</p>
        </div>

        <!-- PIN 验证屏 -->
        <div v-else-if="needsPin && !pinVerified" class="share-pin-screen">
            <div class="share-pin-card">
                <span class="share-pin-screen-icon">🔒</span>
                <h2>需要访问码</h2>
                <p class="share-pin-meta" v-if="meta">{{ meta.icon }} {{ meta.title }} · 由 {{ meta.authorName }} 分享</p>
                <div class="pin-boxes">
                    <input
                        v-for="i in 4" :key="i"
                        :ref="el => { if (el) pinRefs[i-1] = el }"
                        type="text"
                        inputmode="numeric"
                        maxlength="1"
                        v-model="pinDigits[i-1]"
                        :class="{ 'pin-box-error': pinError }"
                        @input="onPinInput(i-1, $event)"
                        @keydown="onPinKeydown($event, i-1)"
                        @paste.prevent="onPinPaste($event)"
                    />
                </div>
                <p v-if="pinError" class="pin-error">{{ pinError }}</p>
                <button
                    class="pin-submit-btn"
                    :disabled="pinLoading || pinInput.length !== 4"
                    @click="verifyPin"
                >
                    {{ pinLoading ? '验证中...' : '确认访问' }}
                </button>
            </div>
        </div>

        <!-- 计划内容 -->
        <template v-else-if="plan">
            <header class="share-header">
                <div class="share-brand">
                    <span class="share-brand-logo">🌸</span>
                    <span class="share-brand-name">MiniList</span>
                </div>
                <div class="share-plan-meta">
                    <span class="share-author">由 {{ plan.author_name }} 分享</span>
                </div>
            </header>

            <main class="share-main">
                <div class="share-plan-header">
                    <span class="share-plan-icon">{{ plan.icon }}</span>
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
                    <span>📋</span>
                    <p>这个计划暂时还没有步骤</p>
                </div>

                <!-- 步骤时间轴 -->
                <div class="share-timeline">
                    <div v-for="step in plan.steps" :key="step.id"
                        :class="['share-step', `step-status-${step.status}`]">
                        <div class="share-step-dot dot-clickable"
                            :title="step.status === 'completed' ? '点击取消完成' : '点击标记完成'"
                            :class="{ toggling: togglingId === step.id }" @click="toggleStep(step)">
                            <span>{{ statusIcon[step.status] || '⬜' }}</span>
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
                                    🗓️ 开始：{{ formatDate(step.start_date) }}
                                </span>
                                <span v-if="step.due_date" class="share-step-date"
                                    :class="{ overdue: isOverdue(step) }">
                                    📅 截止：{{ formatDate(step.due_date) }}
                                </span>
                            </div>

                            <!-- 地点 + 地图 -->
                            <div v-if="step.location" class="share-step-location">
                                <span class="share-step-location-text">📍 {{ step.location }}</span>
                                <div class="share-map-btns">
                                    <a :href="`https://uri.amap.com/search?keyword=${encodeURIComponent(step.location)}&src=minilist&coordinate=gaode&callnative=1`"
                                        target="_blank" class="share-map-btn share-map-btn--amap">高德</a>
                                    <a :href="`http://api.map.baidu.com/geocoder?address=${encodeURIComponent(step.location)}&output=html`"
                                        target="_blank" class="share-map-btn share-map-btn--baidu">百度</a>
                                    <a :href="`https://apis.map.qq.com/uri/v1/search?keyword=${encodeURIComponent(step.location)}&region=中国`"
                                        target="_blank" class="share-map-btn share-map-btn--tencent">腾讯</a>
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
                    🎉 所有步骤已完成！超棒！
                </div>
            </main>
        </template>

        <!-- 图片预览 -->
        <div v-if="preview.show" class="img-preview-overlay"
            @click="preview.show = false"
            @touchstart.passive="onPreviewTouchStart"
            @touchend.passive="onPreviewTouchEnd">
            <img :src="preview.imgs[preview.index]" class="img-preview" @click.stop />
            <!-- 左翻页区 -->
            <div v-if="preview.index > 0" class="preview-zone preview-zone--prev" @click.stop="preview.index--">
                <span class="preview-zone-arrow">❮</span>
            </div>
            <!-- 右翻页区 -->
            <div v-if="preview.index < preview.imgs.length - 1" class="preview-zone preview-zone--next" @click.stop="preview.index++">
                <span class="preview-zone-arrow">❯</span>
            </div>
            <!-- 关闭按鈕 -->
            <button class="preview-close" @click.stop="preview.show = false">✕</button>
            <!-- 计数 -->
            <div v-if="preview.imgs.length > 1" class="preview-counter">{{ preview.index + 1 }} / {{ preview.imgs.length }}</div>
        </div>

        <!-- 返回顶部 -->
        <Transition name="back-top-fade">
            <button v-if="showBackToTop" class="share-back-to-top" @click="scrollToTop" title="返回顶部">
                &#8679;
            </button>
        </Transition>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import axios from 'axios'
import dayjs from 'dayjs'

const route = useRoute()
const loading = ref(true)
const error = ref(false)
const errorMsg = ref('')
const plan = ref(null)
const preview = ref({ show: false, imgs: [], index: 0 })
const togglingId = ref(null)

// PIN 验证
const meta = ref(null)
const needsPin = ref(false)
const pinVerified = ref(false)
const pinDigits = ref(['', '', '', ''])
const pinRefs = []
const pinInput = computed(() => pinDigits.value.join(''))
const pinError = ref('')
const pinLoading = ref(false)

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

const statusIcon = { pending: '⬜', in_progress: '🔄', completed: '✅', skipped: '⏭️' }

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
        await axios.patch(`/api/share/${route.params.token}/steps/${step.id}/status`, { status: newStatus })
        step.status = newStatus
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
    } catch (e) {
        const msg = e.response?.data?.message
        pinError.value = msg === 'EXPIRED' ? '分享链接已过期' : '访问码错误，请重试'
        pinDigits.value = ['', '', '', '']
        pinRefs[0]?.focus()
    } finally {
        pinLoading.value = false
    }
}

const showBackToTop = ref(false)
function handleShareScroll() { showBackToTop.value = window.scrollY > 300 }
function scrollToTop() { window.scrollTo({ top: 0, behavior: 'smooth' }) }

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
        if (data.needsPin) {
            needsPin.value = true
            loading.value = false
        } else {
            // 无需 PIN，直接 verify
            const vRes = await axios.post(`/api/share/${route.params.token}/verify`, { pin: '' })
            plan.value = vRes.data.data
            pinVerified.value = true
            loading.value = false
        }
    } catch (e) {
        const msg = e.response?.data?.message
        if (msg === 'EXPIRED') errorMsg.value = '分享链接已过期'
        error.value = true
        loading.value = false
    }
})

onUnmounted(() => {
    window.removeEventListener('scroll', handleShareScroll)
})
</script>

<style scoped>
.share-page {
    min-height: 100vh;
    background: var(--color-bg, #fafafa);
    font-family: inherit;
}

/* 加载 / 错误 */
.share-loading,
.share-error {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    gap: 16px;
    color: #888;
}

.share-error-icon {
    font-size: 3rem;
}

.share-error h2 {
    font-size: 1.3rem;
    font-weight: 700;
    margin: 0;
    color: #555;
}

/* Header */
.share-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 24px;
    background: var(--color-surface, #fff);
    border-bottom: 1px solid var(--color-border, #eee);
    position: sticky;
    top: 0;
    z-index: 10;
}

.share-brand {
    display: flex;
    align-items: center;
    gap: 6px;
    font-weight: 700;
    font-size: 1rem;
}

.share-brand-logo {
    font-size: 1.2rem;
}

.share-author {
    font-size: 0.82rem;
    color: #888;
}

/* Main */
.share-main {
    max-width: 680px;
    margin: 0 auto;
    padding: 32px 24px 80px;
}

.share-plan-header {
    display: flex;
    align-items: flex-start;
    gap: 16px;
    margin-bottom: 32px;
    flex-wrap: wrap;
}

.share-plan-icon {
    font-size: 2.5rem;
    line-height: 1;
}

.share-plan-title {
    font-size: 1.4rem;
    font-weight: 800;
    margin: 0 0 4px;
    color: var(--color-text, #222);
}

.share-plan-desc {
    font-size: 0.9rem;
    color: #888;
    margin: 0;
}

.share-plan-progress {
    margin-left: auto;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 4px;
    min-width: 120px;
}

.progress-bar {
    width: 100%;
    height: 6px;
    background: #f0f0f0;
    border-radius: 3px;
    overflow: hidden;
}

.progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #f9a8d4, #ec4899);
    border-radius: 3px;
    transition: width 0.3s ease;
}

.progress-text {
    font-size: 0.78rem;
    color: #888;
}

.share-empty {
    text-align: center;
    padding: 60px 20px;
    color: #aaa;
    font-size: 0.9rem;
}

.share-empty span {
    font-size: 2rem;
    display: block;
    margin-bottom: 8px;
}

/* All-done banner */
.share-all-done-banner {
    text-align: center;
    padding: 14px 20px;
    background: linear-gradient(135deg, #fff0f6, #ffe4f0);
    border: 1.5px solid #ec4899;
    border-radius: 12px;
    color: #be185d;
    font-weight: 700;
    font-size: 0.95rem;
    margin-top: 16px;
}

/* Timeline */
.share-timeline {
    display: flex;
    flex-direction: column;
    gap: 0;
}

.share-step {
    display: flex;
    gap: 12px;
    position: relative;
}

.share-step:not(:last-child)::before {
    content: '';
    position: absolute;
    left: 16px;
    top: 36px;
    bottom: -16px;
    width: 2px;
    background: var(--color-border, #eee);
}

.share-step-dot {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: var(--color-surface, #fff);
    border: 2px solid var(--color-border, #eee);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.8rem;
    flex-shrink: 0;
    position: relative;
    z-index: 1;
    margin-top: 4px;
    transition: transform 0.15s, box-shadow 0.15s;
}

.dot-clickable {
    cursor: pointer;
}

.dot-clickable:hover {
    transform: scale(1.18);
    box-shadow: 0 0 0 4px rgba(236, 72, 153, 0.18);
}

.dot-clickable.toggling {
    opacity: 0.5;
    pointer-events: none;
}

.step-status-completed .share-step-dot {
    background: #d4f5e9;
    border-color: #27ae60;
}

.share-step-card {
    flex: 1;
    background: var(--color-surface, #fff);
    border: 1px solid var(--color-border, #eee);
    border-radius: 10px;
    padding: 12px 14px;
    margin-bottom: 16px;
}

.step-status-completed .share-step-card {
    opacity: 0.75;
}

.share-step-head {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;
}

.share-step-title {
    font-weight: 600;
    font-size: 0.95rem;
    color: var(--color-text, #222);
}

.step-status-completed .share-step-title {
    text-decoration: line-through;
    color: #aaa;
}

.share-step-badge {
    font-size: 0.7rem;
    padding: 2px 8px;
    border-radius: 20px;
    border: 1px solid #ccc;
}

.share-step-desc {
    font-size: 0.85rem;
    color: #888;
    margin: 4px 0 8px;
    line-height: 1.6;
    white-space: pre-wrap;
}

.share-step-dates {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    margin-bottom: 8px;
}

.share-step-date {
    font-size: 0.75rem;
    color: #aaa;
}

.share-step-date.overdue {
    color: #e17055;
    font-weight: 600;
}

.share-step-location {
    margin-bottom: 8px;
}

.share-step-location-text {
    font-size: 0.8rem;
    color: #888;
    display: block;
    margin-bottom: 6px;
}

.share-map-btns {
    display: flex;
    gap: 6px;
}

.share-map-btn {
    font-size: 0.72rem;
    padding: 3px 8px;
    border-radius: 4px;
    text-decoration: none;
    font-weight: 600;
    color: #fff;
}

.share-map-btn--amap {
    background: #FF6B35;
}

.share-map-btn--baidu {
    background: #4A90D9;
}

.share-map-btn--tencent {
    background: #07C160;
}

.share-step-imgs {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 6px;
    margin-top: 8px;
}

.share-img-cell {
    aspect-ratio: 1;
    border-radius: 6px;
    overflow: hidden;
    cursor: pointer;
}

.share-img-cell img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

/* 图片预览 */
.img-preview-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.92);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2000;
}

.img-preview {
    max-width: min(80vw, 900px);
    max-height: 80vh;
    border-radius: 8px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
    object-fit: contain;
    user-select: none;
    pointer-events: none;
}

/* 左右全高度点击区 -- 手指友好大面积 */
.preview-zone {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 22vw;
    max-width: 100px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: background 0.15s;
}

.preview-zone--prev { left: 0; }
.preview-zone--next { right: 0; }

.preview-zone:hover {
    background: rgba(255, 255, 255, 0.08);
}

.preview-zone-arrow {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.45);
    backdrop-filter: blur(4px);
    color: #fff;
    font-size: 1.3rem;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1.5px solid rgba(255, 255, 255, 0.25);
    transition: background 0.15s, transform 0.15s;
}

.preview-zone:hover .preview-zone-arrow {
    background: rgba(0, 0, 0, 0.65);
    transform: scale(1.1);
}

/* 关闭按鈕 */
.preview-close {
    position: absolute;
    top: 14px;
    right: 14px;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(4px);
    border: 1.5px solid rgba(255, 255, 255, 0.3);
    color: #fff;
    font-size: 1rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.15s;
    z-index: 10;
}

.preview-close:hover {
    background: rgba(255, 255, 255, 0.2);
}

/* 计数器 */
.preview-counter {
    position: absolute;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(4px);
    color: #fff;
    font-size: 0.82rem;
    padding: 5px 16px;
    border-radius: 20px;
    pointer-events: none;
    letter-spacing: 0.05em;
}

.loading-spinner {
    width: 36px;
    height: 36px;
    border: 3px solid #f0f0f0;
    border-top-color: #f9a8d4;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
}

@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}

/* PIN 验证屏 */
.share-pin-screen {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--color-bg, #fafafa);
    padding: 24px;
}

.share-pin-card {
    background: var(--color-surface, #fff);
    border: 1px solid var(--color-border, #eee);
    border-radius: 20px;
    padding: 40px 32px 36px;
    max-width: 360px;
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);
}

.share-pin-screen-icon {
    font-size: 3rem;
    line-height: 1;
}

.share-pin-card h2 {
    font-size: 1.25rem;
    font-weight: 800;
    margin: 0;
    color: var(--color-text, #222);
}

.share-pin-meta {
    font-size: 0.85rem;
    color: #888;
    margin: 0;
    text-align: center;
}

.pin-boxes {
    display: flex;
    gap: 12px;
    width: 100%;
    margin-top: 4px;
}

.pin-boxes input {
    flex: 1;
    aspect-ratio: 1;
    font-size: 1.8rem;
    font-weight: 800;
    text-align: center;
    border: 2px solid var(--color-border, #eee);
    border-radius: 16px;
    outline: none;
    background: var(--color-bg, #fafafa);
    color: var(--color-text, #222);
    font-family: 'Courier New', monospace;
    transition: border-color 0.2s, box-shadow 0.2s, background 0.2s, transform 0.1s;
    caret-color: #ec4899;
    min-width: 0;
}

.pin-boxes input:focus {
    border-color: #ec4899;
    background: #fff5f8;
    box-shadow: 0 0 0 4px rgba(236, 72, 153, 0.12);
    transform: scale(1.06);
}

.pin-boxes input:not(:placeholder-shown) {
    border-color: #ec489966;
    background: #fff5f8;
}

.pin-boxes input.pin-box-error {
    border-color: #e17055;
    background: #fff5f5;
    animation: pinShake 0.35s ease;
}

@keyframes pinShake {
    0%, 100% { transform: translateX(0); }
    20%       { transform: translateX(-5px); }
    60%       { transform: translateX(5px); }
}

.pin-error {
    font-size: 0.82rem;
    color: #e17055;
    margin: 0;
    font-weight: 600;
}

.pin-submit-btn {
    width: 100%;
    padding: 13px;
    background: linear-gradient(135deg, #f9a8d4, #ec4899);
    color: #fff;
    border: none;
    border-radius: 12px;
    font-size: 0.95rem;
    font-weight: 700;
    cursor: pointer;
    transition: opacity 0.2s;
    font-family: inherit;
    margin-top: 4px;
}

.pin-submit-btn:disabled {
    opacity: 0.45;
    cursor: not-allowed;
}

.pin-submit-btn:not(:disabled):hover {
    opacity: 0.88;
}

/* 返回顶部 */
.share-back-to-top {
    position: fixed;
    right: 28px;
    bottom: 32px;
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: linear-gradient(135deg, #f9a8d4, #ec4899);
    color: #fff;
    border: none;
    font-size: 1.4rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 16px rgba(236, 72, 153, 0.35);
    transition: transform 0.15s, box-shadow 0.15s;
    z-index: 900;
}

.share-back-to-top:hover {
    transform: translateY(-3px) scale(1.08);
    box-shadow: 0 6px 20px rgba(236, 72, 153, 0.45);
}

.back-top-fade-enter-active,
.back-top-fade-leave-active {
    transition: opacity 0.2s, transform 0.2s;
}

.back-top-fade-enter-from,
.back-top-fade-leave-to {
    opacity: 0;
    transform: translateY(12px) scale(0.85);
}
</style>
