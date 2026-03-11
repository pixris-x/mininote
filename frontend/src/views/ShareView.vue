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
            <h2>链接无效或已失效</h2>
            <p>此分享链接可能已被撤销或不存在。</p>
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
                        <div class="share-step-dot">
                            <span>{{ statusIcon[step.status] || '⬜' }}</span>
                        </div>
                        <div class="share-step-card">
                            <div class="share-step-head">
                                <span class="share-step-title">{{ step.title }}</span>
                                <span v-if="step.badge" class="share-step-badge"
                                    :style="badgeStyle(step)">{{ step.badge }}</span>
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
                                    <a :href="`https://ditu.amap.com/search?query=${encodeURIComponent(step.location)}`"
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
            </main>
        </template>

        <!-- 图片预览 -->
        <div v-if="preview.show" class="img-preview-overlay" @click="preview.show = false">
            <img :src="preview.imgs[preview.index]" class="img-preview" @click.stop />
            <button class="preview-nav prev" v-if="preview.index > 0"
                @click.stop="preview.index--">‹</button>
            <button class="preview-nav next" v-if="preview.index < preview.imgs.length - 1"
                @click.stop="preview.index++">›</button>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import axios from 'axios'
import dayjs from 'dayjs'

const route = useRoute()
const loading = ref(true)
const error = ref(false)
const plan = ref(null)
const preview = ref({ show: false, imgs: [], index: 0 })

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

onMounted(async () => {
    try {
        const res = await axios.get(`/api/share/${route.params.token}`)
        plan.value = res.data.data
    } catch {
        error.value = true
    } finally {
        loading.value = false
    }
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

.share-map-btn--amap { background: #FF6B35; }
.share-map-btn--baidu { background: #4A90D9; }
.share-map-btn--tencent { background: #07C160; }

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
    background: rgba(0, 0, 0, 0.85);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2000;
}

.img-preview {
    max-width: 90vw;
    max-height: 90vh;
    border-radius: 8px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}

.preview-nav {
    position: fixed;
    top: 50%;
    transform: translateY(-50%);
    background: rgba(255, 255, 255, 0.2);
    color: #fff;
    border: none;
    width: 40px;
    height: 60px;
    font-size: 1.6rem;
    border-radius: 6px;
    cursor: pointer;
}

.preview-nav.prev { left: 16px; }
.preview-nav.next { right: 16px; }

.loading-spinner {
    width: 36px;
    height: 36px;
    border: 3px solid #f0f0f0;
    border-top-color: #f9a8d4;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
}

@keyframes spin {
    to { transform: rotate(360deg); }
}
</style>
