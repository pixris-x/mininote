<template>
    <AppLayout>
        <div class="expense-view">

            <!-- 月份导航 + Tab -->
            <div class="page-top">
                <div class="month-nav">
                    <button class="month-btn" @click="changeMonth(-1)">&#8249;</button>
                    <div class="month-display">
                        <span class="month-year">{{ currentYear }}年</span>
                        <span class="month-num">{{ String(currentMonth).padStart(2, '0') }}月</span>
                    </div>
                    <button class="month-btn" @click="changeMonth(1)" :disabled="isCurrentMonth">&#8250;</button>
                </div>
                <div class="main-tabs">
                    <button class="main-tab" :class="{ active: activeTab === 'bill' }"
                        @click="activeTab = 'bill'">账单</button>
                    <button class="main-tab" :class="{ active: activeTab === 'stats' }"
                        @click="activeTab = 'stats'">统计</button>
                </div>
            </div>

            <!-- ========== 账单视图 ========== -->
            <template v-if="activeTab === 'bill'">
                <!-- 月汇总卡 -->
                <div class="summary-bar">
                    <div class="summary-item">
                        <div class="summary-label">本月支出</div>
                        <div class="summary-val expense-val">&#165;{{ formatAmount(stats?.monthly_total || 0) }}</div>
                    </div>
                    <div class="summary-divider"></div>
                    <div class="summary-item">
                        <div class="summary-label">今日支出</div>
                        <div class="summary-val">&#165;{{ formatAmount(stats?.today_total || 0) }}</div>
                    </div>
                    <div class="summary-divider"></div>
                    <div class="summary-item">
                        <div class="summary-label">记录笔数</div>
                        <div class="summary-val">{{ stats?.monthly_count || 0 }}</div>
                    </div>
                </div>

                <!-- 分类筛选 -->
                <div class="filter-section">
                    <div class="filter-dropdown" :class="{ open: showFilterDropdown }">
                        <button type="button" class="filter-dropdown-trigger"
                            @click="showFilterDropdown = !showFilterDropdown">
                            <template v-if="filterCategory">
                                <span class="filter-trigger-dot"
                                    :style="{ background: selectedFilterCat?.color }"></span>
                                <span class="filter-trigger-label">{{ selectedFilterCat?.icon }} {{
                                    selectedFilterCat?.name }}</span>
                            </template>
                            <template v-else>
                                <span class="filter-trigger-label">全部分类</span>
                            </template>
                            <svg class="filter-chevron" :class="{ rotated: showFilterDropdown }" width="12" height="12"
                                viewBox="0 0 12 12">
                                <path d="M2 4l4 4 4-4" stroke="currentColor" stroke-width="1.5" fill="none"
                                    stroke-linecap="round" stroke-linejoin="round" />
                            </svg>
                        </button>
                        <div v-show="showFilterDropdown" class="filter-dropdown-list">
                            <button type="button" class="filter-dropdown-item" :class="{ selected: !filterCategory }"
                                @click="filterCategory = null; showFilterDropdown = false">
                                <span class="filter-item-name">全部分类</span>
                                <span v-if="!filterCategory" class="filter-item-check">&#10003;</span>
                            </button>
                            <button v-for="cat in store.categories" :key="cat.id" type="button"
                                class="filter-dropdown-item" :class="{ selected: filterCategory === cat.id }"
                                @click="filterCategory = cat.id; showFilterDropdown = false">
                                <span class="filter-item-dot" :style="{ background: cat.color }"></span>
                                <span class="filter-item-icon-emoji">{{ cat.icon }}</span>
                                <span class="filter-item-name">{{ cat.name }}</span>
                                <span v-if="filterCategory === cat.id" class="filter-item-check">&#10003;</span>
                            </button>
                        </div>
                    </div>
                    <button class="manage-cat-btn" @click="showCatModal = true" title="管理分类">&#9881;</button>
                </div>

                <!-- 消费记录列表 -->
                <div class="expense-list">
                    <div v-if="store.loading" class="empty-state">
                        <div class="empty-icon">&#8987;</div>
                        <p>加载中</p>
                    </div>
                    <div v-else-if="!groupedExpenses.length" class="empty-state">
                        <div class="empty-icon"></div>
                        <p>{{ filterCategory ? "该分类暂无记录" : "本月还没有记录" }}</p>
                        <p class="empty-sub">点击右下角 + 开始记账</p>
                    </div>
                    <template v-else>
                        <div v-for="group in groupedExpenses" :key="group.date" class="day-group">
                            <div class="day-header">
                                <span class="day-date">{{ formatDate(group.date) }}</span>
                                <span class="day-total">-&#165;{{ formatAmount(group.total) }}</span>
                            </div>
                            <div v-for="item in group.items" :key="item.id" class="expense-item"
                                @click="openEdit(item)">
                                <div class="item-icon"
                                    :style="{ background: (item.category_color || '#a29bfe') + '22' }">
                                    {{ item.category_icon || '' }}
                                </div>
                                <div class="item-info">
                                    <div class="item-cat">{{ item.category_name || '未分类' }}</div>
                                    <div v-if="item.note" class="item-note">{{ item.note }}</div>
                                </div>
                                <div class="item-amount">-&#165;{{ formatAmount(item.amount) }}</div>
                            </div>
                        </div>
                    </template>
                </div>
            </template>

            <!-- ========== 统计视图 ========== -->
            <template v-if="activeTab === 'stats'">

                <!-- 汇总三列 -->
                <div class="summary-bar">
                    <div class="summary-item">
                        <div class="summary-label">本月支出</div>
                        <div class="summary-val expense-val">&#165;{{ formatAmount(stats?.monthly_total || 0) }}</div>
                    </div>
                    <div class="summary-divider"></div>
                    <div class="summary-item">
                        <div class="summary-label">笔均消费</div>
                        <div class="summary-val">&#165;{{ stats?.monthly_count ? formatAmount(stats.monthly_total /
                            stats.monthly_count) : '0.00' }}</div>
                    </div>
                    <div class="summary-divider"></div>
                    <div class="summary-item">
                        <div class="summary-label">日均支出</div>
                        <div class="summary-val">&#165;{{ formatAmount(dailyAvg) }}</div>
                    </div>
                </div>

                <!-- 趋势/排行 子Tab -->
                <div class="sub-tabs">
                    <button class="sub-tab" :class="{ active: statsTab === 'trend' }"
                        @click="statsTab = 'trend'">趋势</button>
                    <button class="sub-tab" :class="{ active: statsTab === 'rank' }"
                        @click="statsTab = 'rank'">排行</button>
                </div>

                <!-- ----- 支出趋势 ----- -->
                <template v-if="statsTab === 'trend'">
                    <div class="chart-card">
                        <div class="chart-card-title">支出趋势</div>
                        <div v-if="!hasTrendData" class="chart-empty">暂无支出数据</div>
                        <template v-else>
                            <div ref="trendChartEl" class="echarts-box"></div>
                            <div class="trend-summary">
                                <span>最高 <b>&#165;{{ formatAmount(trendMax.amount) }}</b>（{{ trendMax.day }}日）</span>
                                <span>日均 <b>&#165;{{ formatAmount(dailyAvg) }}</b></span>
                                <span>本月 <b>{{ stats?.monthly_count || 0 }}</b> 笔</span>
                            </div>
                        </template>
                    </div>

                    <!-- 每日明细表 -->
                    <div class="chart-card">
                        <div class="chart-card-title">每日明细</div>
                        <div class="daily-table">
                            <div class="daily-table-head">
                                <span>日期</span><span>支出</span><span>笔数</span>
                            </div>
                            <div v-for="row in dailyTableRows" :key="row.date" class="daily-row"
                                :class="{ 'has-data': row.amount > 0 }">
                                <span class="daily-date">{{ row.label }}</span>
                                <span class="daily-amt" :class="{ 'amt-val': row.amount > 0 }">
                                    {{ row.amount > 0 ? '-' + formatAmount(row.amount) : '' }}
                                </span>
                                <span class="daily-count">{{ row.count > 0 ? row.count : '' }}</span>
                            </div>
                        </div>
                    </div>
                </template>

                <!-- ----- 分类排行 ----- -->
                <template v-if="statsTab === 'rank'">
                    <!-- 甜甜圈 -->
                    <div class="chart-card">
                        <div class="chart-card-title">支出占比</div>
                        <div v-if="!catBreakdown.length" class="chart-empty">暂无支出数据</div>
                        <div v-else ref="pieChartEl" class="echarts-box echarts-box--pie"></div>
                    </div>

                    <!-- 分类排行榜 -->
                    <div class="chart-card">
                        <div class="chart-card-title">分类排行</div>
                        <div v-if="!catBreakdown.length" class="chart-empty">暂无支出数据</div>
                        <div v-else class="rank-list">
                            <div v-for="(cat, i) in catBreakdown" :key="cat.id" class="rank-item">
                                <div class="rank-no" :class="['rank-' + (i + 1)]">{{ i + 1 }}</div>
                                <div class="rank-icon-wrap" :style="{ background: cat.color + '22' }">{{ cat.icon }}
                                </div>
                                <div class="rank-info">
                                    <div class="rank-name-row">
                                        <span class="rank-name">{{ cat.name }}</span>
                                        <span class="rank-amt">&#165;{{ formatAmount(cat.total) }}</span>
                                    </div>
                                    <div class="rank-track">
                                        <div class="rank-fill"
                                            :style="{ width: stats.monthly_total > 0 ? (cat.total / stats.monthly_total * 100) + '%' : '0%', background: cat.color }">
                                        </div>
                                    </div>
                                    <div class="rank-sub">
                                        {{ stats.monthly_total > 0 ? Math.round(cat.total / stats.monthly_total * 100) :
                                            0 }}%
                                        {{ cat.count }} 笔
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </template>

            </template>

            <!-- FAB -->
            <button class="fab" @click="openAdd">＋</button>

            <!-- ===== 新增/编辑 Modal ===== -->
            <Teleport to="body">
                <Transition name="modal">
                    <div v-if="showExpenseModal" class="modal-overlay" @click.self="closeExpenseModal">
                        <div class="modal-sheet expense-sheet">
                            <div class="modal-drag-bar"></div>
                            <div class="modal-header">
                                <h3>{{ editingExpense ? '编辑记录' : '记一笔' }}</h3>
                                <button class="modal-close" @click="closeExpenseModal"></button>
                            </div>
                            <div class="amount-section">
                                <span class="amount-currency">&#165;</span>
                                <input ref="amountInput" v-model="form.amount" type="text" inputmode="decimal"
                                    placeholder="0.00" class="amount-input" @input="onAmountInput" />
                            </div>
                            <div class="modal-label" style="margin-bottom: 8px">消费类型</div>
                            <div class="cat-dropdown" :class="{ open: showCatDropdown }">
                                <button type="button" class="cat-dropdown-trigger"
                                    @click="showCatDropdown = !showCatDropdown">
                                    <template v-if="selectedCat">
                                        <div class="cat-trigger-icon" :style="{ background: selectedCat.color }">{{
                                            selectedCat.icon }}</div>
                                        <span class="cat-trigger-name">{{ selectedCat.name }}</span>
                                    </template>
                                    <template v-else>
                                        <div class="cat-trigger-icon cat-trigger-empty">?</div>
                                        <span class="cat-trigger-name"
                                            style="color: var(--color-text-secondary)">请选择消费类型</span>
                                    </template>
                                    <span class="cat-dropdown-chevron"
                                        :class="{ rotated: showCatDropdown }">&#8964;</span>
                                </button>
                                <div v-show="showCatDropdown" class="cat-dropdown-list">
                                    <button v-for="cat in store.categories" :key="cat.id" type="button"
                                        class="cat-dropdown-item" :class="{ selected: form.category_id === cat.id }"
                                        @click="form.category_id = cat.id; showCatDropdown = false">
                                        <div class="cat-item-icon" :style="{ background: cat.color + '33' }">{{ cat.icon
                                        }}</div>
                                        <span class="cat-item-name">{{ cat.name }}</span>
                                        <span v-if="form.category_id === cat.id" class="cat-item-check">✓</span>
                                    </button>
                                </div>
                            </div>
                            <div class="modal-row">
                                <div class="modal-field">
                                    <div class="modal-label">备注</div>
                                    <input v-model="form.note" type="text" placeholder="添加备注（可选）" class="modal-input"
                                        maxlength="100" />
                                </div>
                                <div class="modal-field">
                                    <div class="modal-label">日期</div>
                                    <AppDatePicker v-model="form.expense_date" placeholder="选择消费日期" />
                                </div>
                            </div>
                            <div class="modal-actions">
                                <button v-if="editingExpense" class="btn-danger" @click="handleDelete"
                                    :disabled="saving">
                                    删除</button>
                                <div class="modal-actions-right">
                                    <button class="btn-ghost" @click="closeExpenseModal" :disabled="saving">取消</button>
                                    <button class="btn-save" @click="handleSave" :disabled="saving || !form.amount">
                                        {{ saving ? '保存中' : '记一笔 ' }}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </Transition>
            </Teleport>

            <!-- ===== 分类管理 Modal ===== -->
            <Teleport to="body">
                <Transition name="modal">
                    <div v-if="showCatModal" class="modal-overlay" @click.self="showCatModal = false">
                        <div class="modal-sheet">
                            <div class="modal-drag-bar"></div>
                            <div class="modal-header">
                                <h3>消费类型管理</h3>
                                <button class="modal-close" @click="showCatModal = false"></button>
                            </div>
                            <div class="cat-manage-list">
                                <div v-for="cat in store.categories" :key="cat.id" class="cat-manage-item">
                                    <div class="cat-manage-icon" :style="{ background: cat.color + '33' }">{{ cat.icon
                                        }}</div>
                                    <span class="cat-manage-name">{{ cat.name }}</span>
                                    <span v-if="cat.is_default" class="cat-sys-badge">系统</span>
                                    <button v-else class="cat-del-btn" @click="handleDeleteCat(cat.id)"></button>
                                </div>
                            </div>
                            <div class="cat-add-area">
                                <div class="modal-label">新增自定义类型</div>
                                <div class="icon-preset-label">选择图标</div>
                                <div class="icon-preset-grid">
                                    <button v-for="ico in PRESET_ICONS" :key="ico" class="icon-preset-btn"
                                        :class="{ active: newCat.icon === ico }" @click="newCat.icon = ico">{{ ico
                                        }}</button>
                                </div>
                                <div class="cat-add-row">
                                    <div class="icon-preview" :title="'已选图标：' + newCat.icon">{{ newCat.icon || '' }}
                                    </div>
                                    <input v-model="newCat.name" type="text" placeholder="输入类型名称"
                                        class="modal-input flex-input" maxlength="20" @keydown.enter="handleAddCat" />
                                    <input v-model="newCat.color" type="color" class="color-picker" />
                                    <button class="btn-save" @click="handleAddCat"
                                        :disabled="!newCat.name.trim()">添加</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </Transition>
            </Teleport>

        </div>
    </AppLayout>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import AppLayout from '@/components/AppLayout.vue'
import AppDatePicker from '@/components/AppDatePicker.vue'
import * as echarts from 'echarts/core'
import { LineChart, PieChart } from 'echarts/charts'
import {
    GridComponent, TooltipComponent, LegendComponent
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
echarts.use([LineChart, PieChart, GridComponent, TooltipComponent, LegendComponent, CanvasRenderer])
import { useExpenseStore } from '@/stores/expense'
import { toast } from '@/utils/toast'
import { showConfirm } from '@/utils/alert'
import dayjs from 'dayjs'

const store = useExpenseStore()
const today = dayjs()
const currentYear = ref(today.year())
const currentMonth = ref(today.month() + 1)
const isCurrentMonth = computed(() => currentYear.value === today.year() && currentMonth.value === today.month() + 1)

// 主 Tab
const activeTab = ref('bill')
// 统计子 Tab
const statsTab = ref('trend')

// ===== 分类筛选下拉 =====
const showFilterDropdown = ref(false)
const allFilterCats = computed(() => store.categories)
const selectedFilterCat = computed(() => store.categories.find(c => c.id === filterCategory.value) || null)

// ===== Modal 分类下拉 =====
const showCatDropdown = ref(false)
const selectedCat = computed(() => store.categories.find(c => c.id === form.value.category_id) || null)

const filterCategory = ref(null)
const stats = computed(() => store.stats)

const groupedExpenses = computed(() => {
    const filtered = filterCategory.value ? store.expenses.filter(e => e.category_id === filterCategory.value) : store.expenses
    const map = {}
    for (const item of filtered) {
        const d = (item.expense_date || '').split('T')[0]
        if (!map[d]) map[d] = { date: d, items: [], total: 0 }
        map[d].items.push(item)
        map[d].total += Number(item.amount)
    }
    return Object.values(map).sort((a, b) => b.date.localeCompare(a.date))
})

// ===== 统计计算 =====
const catBreakdown = computed(() => {
    const bd = stats.value?.category_breakdown || []
    return [...bd].sort((a, b) => b.total - a.total).map(c => ({
        ...c,
        count: store.expenses.filter(e => e.category_id === c.id).length
    }))
})

const daysInMonth = computed(() => dayjs(`${currentYear.value}-${String(currentMonth.value).padStart(2, '0')}-01`).daysInMonth())

const dailyAvg = computed(() => {
    const total = stats.value?.monthly_total || 0
    if (!total) return 0
    const passed = isCurrentMonth.value ? today.date() : daysInMonth.value
    return total / passed
})

// ===== ECharts =====
const trendChartEl = ref(null)
const pieChartEl = ref(null)
let trendChart = null
let pieChart = null

function getCSSVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

// 每日支出 map
const trendDayMap = computed(() => {
    const map = {}
    for (const item of store.expenses) {
        const d = parseInt((item.expense_date || '').split('T')[0].split('-')[2])
        if (!map[d]) map[d] = 0
        map[d] += Number(item.amount)
    }
    return map
})

const hasTrendData = computed(() => Object.keys(trendDayMap.value).length > 0)

const trendMax = computed(() => {
    const map = trendDayMap.value
    let maxDay = 1, maxAmt = 0
    for (const [d, v] of Object.entries(map)) { if (v > maxAmt) { maxAmt = v; maxDay = +d } }
    return { day: maxDay, amount: maxAmt }
})

// 每日明细：只显示已到达的日期
const dailyTableRows = computed(() => {
    const maxDay = isCurrentMonth.value ? today.date() : daysInMonth.value
    const map = {}
    for (const item of store.expenses) {
        const d = (item.expense_date || '').split('T')[0]
        if (!map[d]) map[d] = { amount: 0, count: 0 }
        map[d].amount += Number(item.amount)
        map[d].count++
    }
    return Array.from({ length: maxDay }, (_, i) => {
        const day = maxDay - i
        const date = `${currentYear.value}-${String(currentMonth.value).padStart(2, '0')}-${String(day).padStart(2, '0')}`
        const row = map[date] || { amount: 0, count: 0 }
        return { date, label: `${String(currentMonth.value).padStart(2, '0')}.${String(day).padStart(2, '0')}`, ...row }
    })
})

function buildTrendOption() {
    const primaryDark = getCSSVar('--theme-primary-dark') || '#e91e63'
    const primary = getCSSVar('--theme-primary') || '#f48fb1'
    const borderColor = getCSSVar('--color-border') || '#eee'
    const textColor = getCSSVar('--color-text-secondary') || '#999'
    const maxDay = isCurrentMonth.value ? today.date() : daysInMonth.value
    const map = trendDayMap.value
    const xData = Array.from({ length: maxDay }, (_, i) => `${i + 1}日`)
    const yData = Array.from({ length: maxDay }, (_, i) => +(map[i + 1] || 0).toFixed(2))
    return {
        grid: { top: 20, right: 16, bottom: 28, left: 56 },
        tooltip: {
            trigger: 'axis',
            formatter: params => `${params[0].axisValue}<br/>¥${Number(params[0].value).toFixed(2)}`
        },
        xAxis: {
            type: 'category', data: xData,
            axisLabel: { fontSize: 10, color: textColor },
            axisLine: { lineStyle: { color: borderColor } },
            axisTick: { show: false }
        },
        yAxis: {
            type: 'value',
            axisLabel: { fontSize: 10, color: textColor, formatter: v => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v },
            splitLine: { lineStyle: { color: borderColor, type: 'dashed' } }
        },
        series: [{
            type: 'line', data: yData, smooth: true,
            symbol: 'circle', symbolSize: 6,
            lineStyle: { color: primaryDark, width: 2.5 },
            itemStyle: { color: primaryDark, borderColor: '#fff', borderWidth: 2 },
            areaStyle: {
                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                    { offset: 0, color: primary + 'aa' },
                    { offset: 1, color: primary + '11' }
                ])
            }
        }]
    }
}

function buildPieOption() {
    const bd = catBreakdown.value
    return {
        tooltip: { trigger: 'item', formatter: '{b}: ¥{c} ({d}%)' },
        legend: { show: false },
        series: [{
            type: 'pie',
            radius: ['42%', '68%'],
            center: ['50%', '50%'],
            data: bd.map(c => ({
                name: c.icon + ' ' + c.name,
                value: +Number(c.total).toFixed(2),
                itemStyle: { color: c.color || '#a29bfe' }
            })),
            label: { formatter: '{b}\n{d}%', fontSize: 11, lineHeight: 16 },
            labelLine: { length: 10, length2: 8 },
            emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.2)' } }
        }]
    }
}

function refreshTrendChart() {
    if (!trendChartEl.value) return
    if (trendChart) { trendChart.dispose(); trendChart = null }
    trendChart = echarts.init(trendChartEl.value)
    trendChart.setOption(buildTrendOption(), true)
}

function refreshPieChart() {
    if (!pieChartEl.value) return
    if (pieChart) { pieChart.dispose(); pieChart = null }
    pieChart = echarts.init(pieChartEl.value)
    pieChart.setOption(buildPieOption(), true)
}

function onResize() { trendChart?.resize(); pieChart?.resize() }

function tryRefreshCharts() {
    nextTick(() => {
        if (activeTab.value !== 'stats') return
        if (statsTab.value === 'trend' && hasTrendData.value) refreshTrendChart()
        if (statsTab.value === 'rank' && catBreakdown.value.length) refreshPieChart()
    })
}

function formatAmount(n) { return Number(n).toFixed(2) }
function formatDate(dateStr) {
    const d = dayjs(dateStr)
    const diff = today.startOf('day').diff(d.startOf('day'), 'day')
    if (diff === 0) return `今天 ${d.format('MM/DD')}`
    if (diff === 1) return `昨天 ${d.format('MM/DD')}`
    return d.format('MM月DD日')
}

function changeMonth(delta) {
    let m = currentMonth.value + delta, y = currentYear.value
    if (m > 12) { m = 1; y++ } else if (m < 1) { m = 12; y-- }
    currentMonth.value = m; currentYear.value = y
}

async function loadData() {
    await Promise.all([
        store.fetchExpenses({ year: currentYear.value, month: currentMonth.value }),
        store.fetchStats(currentYear.value, currentMonth.value)
    ])
}
watch([currentYear, currentMonth], loadData)
// 切换主 Tab
watch(activeTab, tryRefreshCharts)
// 切换统计子 Tab
watch(statsTab, tryRefreshCharts)
// 数据加载完成后刷新
watch(() => store.expenses, tryRefreshCharts)
onMounted(async () => {
    await store.fetchCategories()
    await loadData()
    window.addEventListener('resize', onResize)
})
onUnmounted(() => {
    window.removeEventListener('resize', onResize)
    trendChart?.dispose()
    pieChart?.dispose()
})

// ===== Modal =====
const showExpenseModal = ref(false)
const editingExpense = ref(null)
const saving = ref(false)
const amountInput = ref(null)
const defaultForm = () => ({ amount: '', category_id: null, note: '', expense_date: dayjs().format('YYYY-MM-DD') })
const form = ref(defaultForm())

function onAmountInput(e) {
    let v = e.target.value.replace(/[^\d.]/g, '')
    const parts = v.split('.')
    if (parts.length > 2) v = parts[0] + '.' + parts.slice(1).join('')
    if (parts[1]?.length > 2) v = parts[0] + '.' + parts[1].slice(0, 2)
    form.value.amount = v
}

function openAdd() {
    editingExpense.value = null
    form.value = defaultForm()
    showCatDropdown.value = false
    showExpenseModal.value = true
    nextTick(() => amountInput.value?.focus())
}
function openEdit(item) {
    editingExpense.value = item
    form.value = { amount: Number(item.amount).toFixed(2), category_id: item.category_id, note: item.note || '', expense_date: (item.expense_date || '').split('T')[0] }
    showCatDropdown.value = false
    showExpenseModal.value = true
}
function closeExpenseModal() { showExpenseModal.value = false; editingExpense.value = null; showCatDropdown.value = false }

async function handleSave() {
    const amt = Number(form.value.amount)
    if (!amt || amt <= 0) { toast.error('请输入正确的金额'); return }
    saving.value = true
    try {
        const res = editingExpense.value
            ? await store.updateExpense(editingExpense.value.id, { ...form.value, amount: amt })
            : await store.createExpense({ ...form.value, amount: amt })
        if (res.success) {
            toast.success(editingExpense.value ? '已更新' : '记账成功 ')
            closeExpenseModal()
            await loadData()
        } else toast.error(res.message || '操作失败')
    } catch (e) { toast.error(e.message || '操作失败') }
    finally { saving.value = false }
}

async function handleDelete() {
    if (!editingExpense.value) return
    const ok = await showConfirm('确认删除这条记录？', {
        title: '删除记录',
        icon: '🗑️',
        confirmText: '删除',
        variant: 'danger',
    })
    if (!ok) return
    saving.value = true
    try {
        const res = await store.deleteExpense(editingExpense.value.id)
        if (res.success) { toast.success('已删除'); closeExpenseModal(); await loadData() }
    } catch (e) { toast.error(e.message || '删除失败') }
    finally { saving.value = false }
}

// ===== 分类管理 =====
const showCatModal = ref(false)
const PRESET_ICONS = [
    '🍔', '🍜', '🍕', '🍣', '🥗', '🧋', '🍰', '🥩', '🍱', '🍺',
    '🚗', '🚌', '🚇', '✈️', '🚕', '🛵', '🚲', '⛽', '🚢', '🚁',
    '🛒', '👗', '👟', '💄', '🧴', '🎁', '💍', '🧸', '🛍️', '👔',
    '🎮', '🎬', '🎵', '🎨', '📚', '🎯', '🎳', '🎭', '🎠', '🎲',
    '💊', '🏥', '🦷', '💪', '🧘', '🏃', '⚽', '🏊', '🎾', '🧗',
    '🏠', '💡', '📱', '💻', '🔧', '📦', '🧹', '💰', '📝', '🌸'
]
const newCat = ref({ name: '', icon: '', color: '#a29bfe' })
async function handleAddCat() {
    if (!newCat.value.name.trim()) return
    try {
        const res = await store.createCategory({ name: newCat.value.name.trim(), icon: newCat.value.icon || '', color: newCat.value.color })
        if (res.success) { toast.success('分类已添加 '); newCat.value = { name: '', icon: '', color: '#a29bfe' } }
        else toast.error(res.message || '添加失败')
    } catch (e) { toast.error(e.message || '添加失败') }
}
async function handleDeleteCat(id) {
    const ok = await showConfirm('删除该分类？（已有记录不受影响）', {
        title: '删除分类',
        icon: '🗑️',
        confirmText: '删除',
        variant: 'danger',
    })
    if (!ok) return
    try {
        const res = await store.deleteCategory(id)
        if (res.success) toast.success('已删除')
        else toast.error(res.message || '删除失败')
    } catch (e) { toast.error(e.message || '删除失败') }
}
</script>

<style scoped>
.expense-view {
    max-width: 680px;
    width: 100%;
    margin: 0 auto;
    padding: 24px 0 100px;
    box-sizing: border-box;
    overflow-x: hidden;
    min-height: 100vh;
}

/* ===== 顶部月份 + 主Tab ===== */
.page-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 20px 12px;
    gap: 16px;
    flex-wrap: wrap;
}

.month-nav {
    display: flex;
    align-items: center;
    gap: 14px;
}

.month-btn {
    background: var(--theme-primary-light);
    border: none;
    color: var(--theme-primary-dark);
    width: 32px;
    height: 32px;
    border-radius: 50%;
    font-size: 20px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all var(--transition);
    flex-shrink: 0;
}

.month-btn:hover:not(:disabled) {
    background: var(--theme-primary);
    color: white;
}

.month-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
}

.month-display {
    text-align: center;
    line-height: 1;
}

.month-year {
    display: block;
    font-size: 11px;
    color: var(--color-text-secondary);
    margin-bottom: 1px;
}

.month-num {
    font-size: 22px;
    font-weight: 800;
    color: var(--color-text);
    letter-spacing: -0.5px;
}

.main-tabs {
    display: flex;
    background: var(--color-bg);
    border-radius: var(--radius-full);
    padding: 3px;
    border: 1.5px solid var(--color-border);
    gap: 2px;
    flex-shrink: 0;
}

.main-tab {
    padding: 6px 18px;
    border-radius: var(--radius-full);
    border: none;
    background: transparent;
    color: var(--color-text-secondary);
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all var(--transition);
}

.main-tab.active {
    background: var(--theme-primary-dark);
    color: white;
    box-shadow: var(--shadow-sm);
}

/* ===== 汇总栏 ===== */
.summary-bar {
    display: flex;
    align-items: stretch;
    background: var(--color-surface);
    border-radius: var(--radius-xl);
    margin: 0 16px 12px;
    padding: 14px 0;
    box-shadow: var(--shadow-sm);
}

.summary-item {
    flex: 1;
    text-align: center;
    padding: 0 8px;
}

.summary-divider {
    width: 1px;
    background: var(--color-border);
}

.summary-label {
    font-size: 11px;
    color: var(--color-text-secondary);
    margin-bottom: 5px;
}

.summary-val {
    font-size: 17px;
    font-weight: 800;
    color: var(--color-text);
}

.expense-val {
    color: #e74c3c;
}

/* ===== 子Tab ===== */
.sub-tabs {
    display: flex;
    gap: 0;
    margin: 0 16px 12px;
    border-radius: var(--radius-lg);
    overflow: hidden;
    border: 1.5px solid var(--color-border);
    background: var(--color-bg);
}

.sub-tab {
    flex: 1;
    padding: 9px 0;
    border: none;
    background: transparent;
    color: var(--color-text-secondary);
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all var(--transition);
    position: relative;
}

.sub-tab.active {
    background: var(--color-surface);
    color: var(--theme-primary-dark);
}

.sub-tab.active::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 20%;
    right: 20%;
    height: 2.5px;
    background: var(--theme-primary-dark);
    border-radius: 2px;
}

/* ===== 图表卡片 ===== */
.chart-card {
    background: var(--color-surface);
    border-radius: var(--radius-xl);
    margin: 0 16px 12px;
    padding: 16px 20px;
    box-shadow: var(--shadow-sm);
}

.chart-card-title {
    font-size: 13px;
    font-weight: 700;
    color: var(--color-text);
    margin-bottom: 14px;
    display: flex;
    align-items: center;
    gap: 6px;
}

.chart-card-title::before {
    content: '';
    display: inline-block;
    width: 3px;
    height: 14px;
    background: var(--theme-primary-dark);
    border-radius: 2px;
}

.chart-empty {
    text-align: center;
    padding: 24px 0;
    color: var(--color-text-secondary);
    font-size: 13px;
}

/* ===== ECharts 容器 ===== */
.echarts-box {
    width: 100%;
    height: 220px;
}

.echarts-box--pie {
    height: 300px;
}

.trend-summary {
    display: flex;
    justify-content: space-around;
    margin-top: 10px;
    padding-top: 10px;
    border-top: 1px solid var(--color-border);
    font-size: 12px;
    color: var(--color-text-secondary);
}

.trend-summary b {
    color: var(--color-text);
}

/* ===== 每日明细表 ===== */
.daily-table {
    max-height: 340px;
    overflow-y: auto;
}

.daily-table-head {
    display: grid;
    grid-template-columns: 1fr 1.5fr 0.8fr;
    padding: 8px 4px;
    font-size: 11px;
    color: var(--color-text-secondary);
    font-weight: 700;
    text-transform: uppercase;
    border-bottom: 1.5px solid var(--color-border);
    position: sticky;
    top: 0;
    background: var(--color-surface);
}

.daily-table-head span:last-child {
    text-align: center;
}

.daily-row {
    display: grid;
    grid-template-columns: 1fr 1.5fr 0.8fr;
    padding: 9px 4px;
    border-bottom: 1px solid var(--color-border);
    font-size: 13px;
    color: var(--color-text-secondary);
    transition: background var(--transition);
}

.daily-row:last-child {
    border-bottom: none;
}

.daily-row.has-data {
    color: var(--color-text);
}

.daily-date {
    font-variant-numeric: tabular-nums;
}

.daily-amt.amt-val {
    color: #e74c3c;
    font-weight: 700;
}

.daily-count {
    text-align: center;
}

/* ===== 分类排行 ===== */
.rank-list {
    display: flex;
    flex-direction: column;
    gap: 14px;
}

.rank-item {
    display: flex;
    align-items: center;
    gap: 12px;
}

.rank-no {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    font-weight: 800;
    flex-shrink: 0;
    background: var(--color-border);
    color: var(--color-text-secondary);
}

.rank-1 {
    background: #FFD700;
    color: #7a5f00;
}

.rank-2 {
    background: #C0C0C0;
    color: #555;
}

.rank-3 {
    background: #CD7F32;
    color: #5a3010;
}

.rank-icon-wrap {
    width: 40px;
    height: 40px;
    border-radius: var(--radius-md);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    flex-shrink: 0;
}

.rank-info {
    flex: 1;
    min-width: 0;
}

.rank-name-row {
    display: flex;
    justify-content: space-between;
    margin-bottom: 4px;
}

.rank-name {
    font-size: 14px;
    font-weight: 600;
    color: var(--color-text);
}

.rank-amt {
    font-size: 14px;
    font-weight: 700;
    color: var(--color-text);
}

.rank-track {
    height: 5px;
    background: var(--color-border);
    border-radius: 99px;
    overflow: hidden;
    margin-bottom: 3px;
}

.rank-fill {
    height: 100%;
    border-radius: 99px;
    transition: width 0.6s ease;
}

.rank-sub {
    font-size: 11px;
    color: var(--color-text-secondary);
}

/* ===== 分类筛选 ===== */
.filter-section {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0 16px;
    margin-bottom: 12px;
}

/* ===== 分类筛选下拉 ===== */
.filter-dropdown {
    position: relative;
}

.filter-dropdown-trigger {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px 6px 14px;
    background: var(--color-surface);
    border: 1.5px solid var(--color-border);
    border-radius: var(--radius-full);
    cursor: pointer;
    transition: all var(--transition);
    white-space: nowrap;
}

.filter-dropdown-trigger:hover,
.filter-dropdown.open .filter-dropdown-trigger {
    border-color: var(--theme-primary);
    background: var(--theme-primary-light);
}

.filter-trigger-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
}

.filter-trigger-label {
    font-size: 13px;
    font-weight: 600;
    color: var(--color-text);
}

.filter-dropdown.open .filter-trigger-label {
    color: var(--theme-primary-dark);
}

.filter-chevron {
    color: var(--color-text-secondary);
    flex-shrink: 0;
    transition: transform var(--transition);
}

.filter-chevron.rotated {
    transform: rotate(180deg);
}

.filter-dropdown-list {
    position: absolute;
    top: calc(100% + 6px);
    left: 0;
    min-width: 160px;
    background: var(--color-surface);
    border: 1.5px solid var(--color-border);
    border-radius: var(--radius-lg);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
    z-index: 300;
    max-height: 280px;
    overflow-y: auto;
    overscroll-behavior: contain;
    scrollbar-width: thin;
    scrollbar-color: var(--color-border) transparent;
}

.filter-dropdown-list::-webkit-scrollbar {
    width: 4px;
}

.filter-dropdown-list::-webkit-scrollbar-thumb {
    background: var(--color-border);
    border-radius: 99px;
}

.filter-dropdown-item {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    background: transparent;
    border: none;
    border-bottom: 1px solid var(--color-border);
    cursor: pointer;
    transition: background var(--transition);
    text-align: left;
}

.filter-dropdown-item:last-child {
    border-bottom: none;
}

.filter-dropdown-item:hover {
    background: var(--theme-primary-light);
}

.filter-dropdown-item.selected {
    background: var(--theme-primary-light);
}

.filter-item-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
}

.filter-item-icon-emoji {
    font-size: 16px;
    flex-shrink: 0;
}

.filter-item-name {
    flex: 1;
    font-size: 13px;
    font-weight: 500;
    color: var(--color-text);
    white-space: nowrap;
}

.filter-dropdown-item.selected .filter-item-name {
    font-weight: 700;
    color: var(--theme-primary-dark);
}

.filter-item-check {
    font-size: 12px;
    color: var(--theme-primary-dark);
    font-weight: 700;
    flex-shrink: 0;
}

.manage-cat-btn {
    width: 36px;
    height: 36px;
    background: var(--color-surface);
    border: 1.5px solid var(--color-border);
    border-radius: 50%;
    cursor: pointer;
    font-size: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all var(--transition);
    color: var(--color-text-secondary);
    flex-shrink: 0;
}

.manage-cat-btn:hover {
    background: var(--theme-primary-light);
    border-color: var(--theme-primary);
    color: var(--theme-primary-dark);
}

/* ===== 记录列表 ===== */
.expense-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 0 16px;
}

.empty-state {
    text-align: center;
    padding: 60px 20px 40px;
    color: var(--color-text-secondary);
}

.empty-icon {
    font-size: 52px;
    margin-bottom: 12px;
}

.empty-state p {
    font-size: 15px;
    margin: 0 0 6px;
}

.empty-sub {
    font-size: 13px;
    color: var(--color-text-light) !important;
}

.day-group {
    background: var(--color-surface);
    border-radius: var(--radius-lg);
    overflow: hidden;
    box-shadow: var(--shadow-sm);
}

.day-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 16px;
    background: var(--color-bg);
    border-bottom: 1px solid var(--color-border);
}

.day-date {
    font-size: 12px;
    color: var(--color-text-secondary);
    font-weight: 600;
}

.day-total {
    font-size: 13px;
    color: var(--theme-primary-dark);
    font-weight: 700;
}

.expense-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 16px;
    cursor: pointer;
    transition: background var(--transition);
    border-bottom: 1px solid var(--color-border);
}

.expense-item:last-child {
    border-bottom: none;
}

.expense-item:hover {
    background: var(--theme-primary-light);
}

.item-icon {
    width: 44px;
    height: 44px;
    border-radius: var(--radius-md);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 22px;
    flex-shrink: 0;
}

.item-info {
    flex: 1;
    min-width: 0;
}

.item-cat {
    font-size: 15px;
    font-weight: 600;
    color: var(--color-text);
}

.item-note {
    font-size: 12px;
    color: var(--color-text-secondary);
    margin-top: 2px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.item-amount {
    font-size: 16px;
    font-weight: 700;
    color: var(--color-text);
    flex-shrink: 0;
}

/* ===== FAB ===== */
.fab {
    position: fixed;
    bottom: calc(64px + 20px);
    right: 20px;
    width: 54px;
    height: 54px;
    border-radius: 50%;
    background: var(--theme-primary-dark);
    color: white;
    font-size: 28px;
    border: none;
    cursor: pointer;
    box-shadow: var(--shadow-md);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform var(--transition), box-shadow var(--transition);
    z-index: 50;
    line-height: 1;
}

.fab:hover {
    transform: scale(1.1);
    box-shadow: var(--shadow-lg);
}

@media (min-width: 768px) {
    .fab {
        bottom: 28px;
        right: 32px;
    }
}

/* ===== Modal 动画 ===== */
.modal-enter-active,
.modal-leave-active {
    transition: opacity 0.2s ease;
}

.modal-enter-active .modal-sheet,
.modal-leave-active .modal-sheet {
    transition: transform 0.25s ease;
}

.modal-enter-from,
.modal-leave-to {
    opacity: 0;
}

.modal-enter-from .modal-sheet,
.modal-leave-to .modal-sheet {
    transform: translateY(30px);
}

/* ===== Modal ===== */
.modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, .4);
    display: flex;
    align-items: flex-end;
    justify-content: center;
    z-index: 9000;
    backdrop-filter: blur(2px);
}

@media (min-width: 540px) {
    .modal-overlay {
        align-items: center;
        padding: 20px;
    }

    .modal-sheet {
        border-radius: var(--radius-xl) !important;
        max-width: 500px;
    }
}

.modal-sheet {
    background: var(--color-surface);
    border-radius: var(--radius-xl) var(--radius-xl) 0 0;
    width: 100%;
    padding: 12px 20px 32px;
    max-height: 92vh;
    overflow-y: auto;
    overscroll-behavior: contain;
}

.modal-drag-bar {
    width: 40px;
    height: 4px;
    background: var(--color-border);
    border-radius: 99px;
    margin: 0 auto 16px;
}

.modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
}

.modal-header h3 {
    font-size: 18px;
    font-weight: 700;
    color: var(--color-text);
}

.modal-close {
    width: 32px;
    height: 32px;
    background: var(--color-bg);
    border: none;
    border-radius: 50%;
    cursor: pointer;
    color: var(--color-text-secondary);
    font-size: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background var(--transition);
}

.modal-close:hover {
    background: var(--color-border);
}

.amount-section {
    display: flex;
    align-items: baseline;
    gap: 6px;
    background: var(--color-bg);
    border-radius: var(--radius-lg);
    padding: 12px 20px;
    margin-bottom: 20px;
    border: 2px solid var(--color-border);
    transition: border-color var(--transition);
}

.amount-section:focus-within {
    border-color: var(--theme-primary);
}

.amount-currency {
    font-size: 26px;
    font-weight: 700;
    color: var(--theme-primary-dark);
    flex-shrink: 0;
}

.amount-input {
    flex: 1;
    border: none;
    background: transparent;
    font-size: 36px;
    font-weight: 800;
    color: var(--color-text);
    outline: none;
    min-width: 0;
    width: 100%;
    -webkit-appearance: none;
    appearance: none;
    font-family: inherit;
}

.amount-input::placeholder {
    color: var(--color-border);
}

.modal-label {
    font-size: 11px;
    color: var(--color-text-secondary);
    font-weight: 700;
    letter-spacing: 0.5px;
    text-transform: uppercase;
}

/* ===== 分类下拉选择器 ===== */
.cat-dropdown {
    position: relative;
    margin-bottom: 16px;
}

.cat-dropdown-trigger {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 14px;
    background: var(--color-bg);
    border: 1.5px solid var(--color-border);
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: border-color var(--transition);
    text-align: left;
}

.cat-dropdown-trigger:hover,
.cat-dropdown.open .cat-dropdown-trigger {
    border-color: var(--theme-primary);
    background: var(--color-surface);
}

.cat-trigger-icon {
    width: 34px;
    height: 34px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    flex-shrink: 0;
}

.cat-trigger-empty {
    background: var(--color-border);
    color: var(--color-text-secondary);
    font-size: 14px;
    font-weight: 700;
}

.cat-trigger-name {
    flex: 1;
    font-size: 15px;
    font-weight: 600;
    color: var(--color-text);
    min-width: 0;
}

.cat-dropdown-chevron {
    font-size: 18px;
    color: var(--color-text-secondary);
    flex-shrink: 0;
    transition: transform var(--transition);
    line-height: 1;
}

.cat-dropdown-chevron.rotated {
    transform: rotate(180deg);
}

.cat-dropdown-list {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    right: 0;
    background: var(--color-surface);
    border: 1.5px solid var(--color-border);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-md);
    z-index: 200;
    max-height: 240px;
    overflow-y: auto;
    overscroll-behavior: contain;
    scrollbar-width: thin;
    scrollbar-color: var(--color-border) transparent;
}

.cat-dropdown-list::-webkit-scrollbar {
    width: 4px;
}

.cat-dropdown-list::-webkit-scrollbar-thumb {
    background: var(--color-border);
    border-radius: 99px;
}

.cat-dropdown-item {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 14px;
    background: transparent;
    border: none;
    border-bottom: 1px solid var(--color-border);
    cursor: pointer;
    transition: background var(--transition);
    text-align: left;
}

.cat-dropdown-item:last-child {
    border-bottom: none;
}

.cat-dropdown-item:hover {
    background: var(--theme-primary-light);
}

.cat-dropdown-item.selected {
    background: var(--theme-primary-light);
}

.cat-item-icon {
    width: 34px;
    height: 34px;
    border-radius: var(--radius-sm);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    flex-shrink: 0;
}

.cat-item-name {
    flex: 1;
    font-size: 14px;
    font-weight: 500;
    color: var(--color-text);
}

.cat-dropdown-item.selected .cat-item-name {
    font-weight: 700;
    color: var(--theme-primary-dark);
}

.cat-item-check {
    font-size: 14px;
    color: var(--theme-primary-dark);
    font-weight: 700;
    flex-shrink: 0;
}

.modal-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-bottom: 4px;
}

.modal-field {
    min-width: 0;
}

.modal-input {
    width: 100%;
    padding: 10px 12px;
    background: var(--color-bg);
    border: 1.5px solid var(--color-border);
    border-radius: var(--radius-md);
    color: var(--color-text);
    font-size: 14px;
    outline: none;
    box-sizing: border-box;
    transition: border-color var(--transition);
    font-family: inherit;
}

.modal-input:focus {
    border-color: var(--theme-primary);
    background: var(--color-surface);
}

.modal-field .modal-label {
    margin-bottom: 6px;
    display: block;
}

.modal-actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 16px;
    gap: 10px;
}

.modal-actions-right {
    display: flex;
    gap: 10px;
    margin-left: auto;
}

.btn-save {
    padding: 11px 24px;
    background: var(--theme-primary-dark);
    color: white;
    border: none;
    border-radius: var(--radius-md);
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    transition: opacity var(--transition);
    white-space: nowrap;
}

.btn-save:disabled {
    opacity: 0.45;
    cursor: not-allowed;
}

.btn-save:hover:not(:disabled) {
    opacity: 0.85;
}

.btn-ghost {
    padding: 11px 20px;
    background: transparent;
    color: var(--color-text-secondary);
    border: 1.5px solid var(--color-border);
    border-radius: var(--radius-md);
    font-size: 14px;
    cursor: pointer;
    transition: all var(--transition);
}

.btn-ghost:hover {
    background: var(--color-bg);
}

.btn-danger {
    padding: 11px 16px;
    background: #fff0f0;
    color: #e74c3c;
    border: 1.5px solid #fcc;
    border-radius: var(--radius-md);
    font-size: 13px;
    cursor: pointer;
    transition: all var(--transition);
}

.btn-danger:hover {
    background: #ffe0e0;
}

.btn-danger:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

/* ===== 分类管理 ===== */
.cat-manage-list {
    display: flex;
    flex-direction: column;
    max-height: 260px;
    overflow-y: auto;
    margin-bottom: 20px;
    border-radius: var(--radius-md);
    border: 1px solid var(--color-border);
}

.cat-manage-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 11px 14px;
    background: var(--color-surface);
    border-bottom: 1px solid var(--color-border);
    transition: background var(--transition);
}

.cat-manage-item:last-child {
    border-bottom: none;
}

.cat-manage-item:hover {
    background: var(--color-bg);
}

.cat-manage-icon {
    width: 36px;
    height: 36px;
    border-radius: var(--radius-sm);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    flex-shrink: 0;
}

.cat-manage-name {
    flex: 1;
    font-size: 14px;
    color: var(--color-text);
    font-weight: 500;
}

.cat-sys-badge {
    font-size: 11px;
    background: var(--theme-primary-light);
    color: var(--theme-primary-dark);
    padding: 2px 8px;
    border-radius: var(--radius-full);
    font-weight: 600;
}

.cat-del-btn {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: #fff0f0;
    border: none;
    color: #e74c3c;
    cursor: pointer;
    font-size: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background var(--transition);
}

.cat-del-btn:hover {
    background: #ffe0e0;
}

.cat-add-area {
    border-top: 1px solid var(--color-border);
    padding-top: 16px;
}

.icon-preset-label {
    font-size: 11px;
    color: var(--color-text-secondary);
    font-weight: 700;
    letter-spacing: 0.4px;
    text-transform: uppercase;
    margin-bottom: 8px;
}

.icon-preset-grid {
    display: grid;
    grid-template-columns: repeat(10, 1fr);
    gap: 4px;
    max-height: 140px;
    overflow-y: auto;
    background: var(--color-bg);
    border: 1.5px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: 8px;
    margin-bottom: 12px;
    scrollbar-width: thin;
    scrollbar-color: var(--color-border) transparent;
}

.icon-preset-grid::-webkit-scrollbar {
    width: 4px;
}

.icon-preset-grid::-webkit-scrollbar-thumb {
    background: var(--color-border);
    border-radius: 99px;
}

.icon-preset-btn {
    width: 100%;
    aspect-ratio: 1;
    background: transparent;
    border: 1.5px solid transparent;
    border-radius: var(--radius-sm);
    font-size: 18px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all var(--transition);
    line-height: 1;
    padding: 0;
}

.icon-preset-btn:hover {
    background: var(--theme-primary-light);
    border-color: var(--theme-primary);
    transform: scale(1.12);
}

.icon-preset-btn.active {
    background: var(--theme-primary-light);
    border-color: var(--theme-primary-dark);
    box-shadow: 0 0 0 1.5px var(--theme-primary-dark);
}

.icon-preview {
    width: 42px;
    height: 42px;
    flex-shrink: 0;
    background: var(--color-bg);
    border: 1.5px solid var(--color-border);
    border-radius: var(--radius-md);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
}

.cat-add-row {
    display: flex;
    gap: 8px;
    align-items: center;
}

.flex-input {
    flex: 1;
}

.color-picker {
    width: 38px;
    height: 38px;
    border: 1.5px solid var(--color-border);
    border-radius: var(--radius-sm);
    padding: 2px;
    cursor: pointer;
    background: var(--color-bg);
    flex-shrink: 0;
}

/* ===== 移动端响应式 ===== */
@media (max-width: 400px) {
    .page-top {
        padding: 0 12px 10px;
        gap: 8px;
        justify-content: center;
        flex-direction: column;
        align-items: center;
    }

    .month-nav {
        width: 100%;
        justify-content: center;
    }

    .month-btn {
        width: 28px;
        height: 28px;
        font-size: 18px;
    }

    .month-num {
        font-size: 18px;
    }

    .month-nav {
        gap: 8px;
    }

    .main-tab {
        padding: 5px 20px;
        font-size: 12px;
    }

    .summary-bar {
        margin: 0 12px 10px;
        padding: 12px 0;
    }

    .summary-label {
        font-size: 10px;
    }

    .summary-val {
        font-size: 14px;
    }

    .summary-item {
        padding: 0 4px;
    }

    .filter-section {
        padding: 0 12px;
        gap: 4px;
    }

    .manage-cat-btn {
        width: 30px;
        height: 30px;
        font-size: 14px;
    }

    .expense-list {
        padding: 0 12px;
    }

    .expense-view {
        padding: 16px 0 100px;
    }

    .sub-tabs {
        margin: 0 12px 10px;
    }

    .chart-card {
        margin: 0 12px 10px;
        padding: 14px 14px;
    }

}

@media (max-width: 340px) {
    .main-tab {
        padding: 5px 14px;
        font-size: 11px;
    }

    .month-num {
        font-size: 16px;
    }

    .summary-val {
        font-size: 13px;
    }

    .summary-label {
        font-size: 9px;
    }
}
</style>
