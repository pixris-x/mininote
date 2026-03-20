<template>
    <AppLayout>
        <div class="expense-view">

            <!-- 月份导航 + Tab -->
            <div class="page-top">
                <div class="month-nav">
                    <button class="month-btn" @click="changeMonth(-1)">
                        <ChevronLeft class="month-btn-icon" />
                    </button>
                    <div class="month-display">
                        <span class="month-year">{{ currentYear }}年</span>
                        <span class="month-num">{{ String(currentMonth).padStart(2, '0') }}月</span>
                    </div>
                    <button class="month-btn" @click="changeMonth(1)" :disabled="isCurrentMonth">
                        <ChevronRight class="month-btn-icon" />
                    </button>
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
                                <span class="filter-trigger-label">
                                    <component v-if="hasExpenseIcon(selectedFilterCat?.icon)"
                                        :is="getExpenseIconComponent(selectedFilterCat?.icon)"
                                        class="filter-item-icon-svg" />
                                    {{ selectedFilterCat?.name }}
                                </span>
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
                                <Check v-if="!filterCategory" class="filter-item-check" />
                            </button>
                            <button v-for="cat in store.categories" :key="cat.id" type="button"
                                class="filter-dropdown-item" :class="{ selected: filterCategory === cat.id }"
                                @click="filterCategory = cat.id; showFilterDropdown = false">
                                <span class="filter-item-dot" :style="{ background: cat.color }"></span>
                                <component v-if="hasExpenseIcon(cat.icon)" :is="getExpenseIconComponent(cat.icon)"
                                    class="filter-item-icon-svg" />
                                <span class="filter-item-name">{{ cat.name }}</span>
                                <Check v-if="filterCategory === cat.id" class="filter-item-check" />
                            </button>
                        </div>
                    </div>
                    <button class="manage-cat-btn" @click="showCatModal = true" title="管理分类">
                        <Settings2 class="manage-icon" />
                    </button>
                </div>

                <!-- 消费记录列表 -->
                <div class="expense-list">
                    <div v-if="store.loading" class="empty-state">
                        <LoaderCircle class="empty-icon spin" />
                        <p>加载中</p>
                    </div>
                    <div v-else-if="!groupedExpenses.length" class="empty-state">
                        <div class="empty-icon"></div>
                        <p>{{ filterCategory ? "该分类暂无记录" : "本月还没有记录" }}</p>
                        <p class="empty-sub">点击右下角按钮开始记账</p>
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
                                    <component v-if="hasExpenseIcon(item.category_icon)"
                                        :is="getExpenseIconComponent(item.category_icon)" class="item-icon-svg" />
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
                                <div class="rank-icon-wrap" :style="{ background: cat.color + '22' }">
                                    <component v-if="hasExpenseIcon(cat.icon)" :is="getExpenseIconComponent(cat.icon)"
                                        class="rank-icon-svg" />
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
            <button class="fab" @click="openAdd">
                <Plus class="fab-icon" />
            </button>

            <!-- ===== 新增/编辑 Modal ===== -->
            <Teleport to="body">
                <Transition name="modal">
                    <div v-if="showExpenseModal" class="modal-overlay" @click.self="closeExpenseModal">
                        <div class="modal-sheet expense-sheet">
                            <div class="modal-drag-bar"></div>
                            <div class="modal-header">
                                <h3>{{ editingExpense ? '编辑记录' : '记一笔' }}</h3>
                                <button class="modal-close" @click="closeExpenseModal">
                                    <X class="modal-close-icon" />
                                </button>
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
                                        <div class="cat-trigger-icon" :style="{ background: selectedCat.color }">
                                            <component v-if="hasExpenseIcon(selectedCat.icon)"
                                                :is="getExpenseIconComponent(selectedCat.icon)"
                                                class="cat-icon-svg cat-icon-svg--light" />
                                        </div>
                                        <span class="cat-trigger-name">{{ selectedCat.name }}</span>
                                    </template>
                                    <template v-else>
                                        <div class="cat-trigger-icon cat-trigger-empty">?</div>
                                        <span class="cat-trigger-name"
                                            style="color: var(--color-text-secondary)">请选择消费类型</span>
                                    </template>
                                    <ChevronDown class="cat-dropdown-chevron"
                                        :class="{ rotated: showCatDropdown }" />
                                </button>
                                <div v-show="showCatDropdown" class="cat-dropdown-list">
                                    <button v-for="cat in store.categories" :key="cat.id" type="button"
                                        class="cat-dropdown-item" :class="{ selected: form.category_id === cat.id }"
                                        @click="form.category_id = cat.id; showCatDropdown = false">
                                        <div class="cat-item-icon" :style="{ background: cat.color + '33' }">
                                            <component v-if="hasExpenseIcon(cat.icon)"
                                                :is="getExpenseIconComponent(cat.icon)" class="cat-icon-svg" />
                                        </div>
                                        <span class="cat-item-name">{{ cat.name }}</span>
                                        <Check v-if="form.category_id === cat.id" class="cat-item-check" />
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
                                <button class="modal-close" @click="showCatModal = false">
                                    <X class="modal-close-icon" />
                                </button>
                            </div>
                            <div class="cat-manage-list">
                                <div v-for="cat in store.categories" :key="cat.id" class="cat-manage-item">
                                    <div class="cat-manage-icon" :style="{ background: cat.color + '33' }">
                                        <component v-if="hasExpenseIcon(cat.icon)" :is="getExpenseIconComponent(cat.icon)"
                                            class="cat-icon-svg" />
                                    </div>
                                    <span class="cat-manage-name">{{ cat.name }}</span>
                                    <span v-if="cat.is_default" class="cat-sys-badge">系统</span>
                                    <button v-else class="cat-del-btn" @click="handleDeleteCat(cat.id)">
                                        <Trash2 class="cat-del-icon" />
                                    </button>
                                </div>
                            </div>
                            <div class="cat-add-area">
                                <div class="modal-label">新增自定义类型</div>
                                <div class="icon-preset-label">选择图标</div>
                                <div class="icon-preset-grid">
                                    <button v-for="ico in PRESET_ICONS" :key="ico" class="icon-preset-btn"
                                        :class="{ active: newCat.icon === normalizeExpenseIcon(ico) }"
                                        @click="newCat.icon = normalizeExpenseIcon(ico)">
                                        <component :is="getExpenseIconComponent(ico)" class="icon-preset-svg" />
                                    </button>
                                </div>
                                <div class="cat-add-row">
                                    <div class="icon-preview" :title="'已选图标：' + newCat.icon">
                                        <component v-if="newCat.icon && hasExpenseIcon(newCat.icon)"
                                            :is="getExpenseIconComponent(newCat.icon)" class="icon-preview-svg" />
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
import {
    Beef,
    Beer,
    Bike,
    BookOpen,
    Brush,
    Bus,
    CakeSlice,
    Car,
    Check,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Clapperboard,
    CupSoda,
    Dice5,
    Dumbbell,
    Fish,
    Flower2,
    Fuel,
    Gamepad2,
    Gem,
    Gift,
    Hospital,
    House,
    Laptop,
    Lightbulb,
    LoaderCircle,
    Music2,
    NotebookPen,
    Package,
    Palette,
    PawPrint,
    PersonStanding,
    Pill,
    Pizza,
    Plane,
    Plus,
    Salad,
    Settings2,
    Shirt,
    Ship,
    ShoppingCart,
    Smartphone,
    Soup,
    Tag,
    Target,
    Theater,
    TramFront,
    Trash2,
    Utensils,
    Wallet,
    Wrench,
    X
} from 'lucide-vue-next'
import dayjs from 'dayjs'

const store = useExpenseStore()
const EXPENSE_ICON_COMPONENTS = {
    food: Utensils,
    noodles: Soup,
    pizza: Pizza,
    fish: Fish,
    salad: Salad,
    drink: CupSoda,
    dessert: CakeSlice,
    meat: Beef,
    meal_box: Package,
    beer: Beer,
    car: Car,
    bus: Bus,
    subway: TramFront,
    plane: Plane,
    bike: Bike,
    fuel: Fuel,
    ship: Ship,
    shopping: ShoppingCart,
    clothes: Shirt,
    makeup: Palette,
    gift: Gift,
    jewel: Gem,
    game: Gamepad2,
    movie: Clapperboard,
    music: Music2,
    art: Palette,
    study: BookOpen,
    goal: Target,
    theater: Theater,
    dice: Dice5,
    medicine: Pill,
    hospital: Hospital,
    fitness: Dumbbell,
    sports: PersonStanding,
    home: House,
    light: Lightbulb,
    phone: Smartphone,
    laptop: Laptop,
    tool: Wrench,
    package: Package,
    clean: Brush,
    money: Wallet,
    note: NotebookPen,
    flower: Flower2,
    pet: PawPrint,
    tag: Tag
}
const EXPENSE_EMOJI_ALIAS = {
    '🍔': 'food', '🍜': 'noodles', '🍕': 'pizza', '🍣': 'fish', '🥗': 'salad', '🧋': 'drink',
    '🍰': 'dessert', '🥩': 'meat', '🍱': 'meal_box', '🍺': 'beer',
    '🚗': 'car', '🚌': 'bus', '🚇': 'subway', '✈️': 'plane', '🚕': 'car', '🛵': 'bike',
    '🚲': 'bike', '⛽': 'fuel', '🚢': 'ship', '🚁': 'plane',
    '🛒': 'shopping', '👗': 'clothes', '👟': 'clothes', '💄': 'makeup', '🧴': 'package', '🎁': 'gift',
    '💍': 'jewel', '🧸': 'gift', '🛍️': 'shopping', '👔': 'clothes',
    '🎮': 'game', '🎬': 'movie', '🎵': 'music', '🎨': 'art', '📚': 'study', '🎯': 'goal',
    '🎳': 'dice', '🎭': 'theater', '🎠': 'theater', '🎲': 'dice',
    '💊': 'medicine', '🏥': 'hospital', '🦷': 'hospital', '💪': 'fitness', '🧘': 'sports', '🏃': 'sports',
    '⚽': 'sports', '🏊': 'sports', '🎾': 'sports', '🧗': 'sports',
    '🏠': 'home', '💡': 'light', '📱': 'phone', '💻': 'laptop', '🔧': 'tool', '📦': 'package',
    '🧹': 'clean', '💰': 'money', '📝': 'note', '🌸': 'flower', '🐾': 'pet', '🏷️': 'tag'
}

function normalizeExpenseIcon(icon) {
    if (!icon) return ''
    if (EXPENSE_ICON_COMPONENTS[icon]) return icon
    return EXPENSE_EMOJI_ALIAS[icon] || icon
}

function getExpenseIconComponent(icon) {
    const key = normalizeExpenseIcon(icon)
    return EXPENSE_ICON_COMPONENTS[key] || null
}

function hasExpenseIcon(icon) {
    return !!getExpenseIconComponent(icon)
}

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
                name: c.name,
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
        icon: '!',
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
    'food', 'noodles', 'pizza', 'fish', 'salad', 'drink', 'dessert', 'meat', 'meal_box', 'beer',
    'car', 'bus', 'subway', 'plane', 'bike', 'fuel', 'ship',
    'shopping', 'clothes', 'makeup', 'gift', 'jewel',
    'game', 'movie', 'music', 'art', 'study', 'goal', 'theater', 'dice',
    'medicine', 'hospital', 'fitness', 'sports',
    'home', 'light', 'phone', 'laptop', 'tool', 'package', 'clean', 'money', 'note', 'flower', 'pet', 'tag'
]
const newCat = ref({ name: '', icon: '', color: '#a29bfe' })
async function handleAddCat() {
    if (!newCat.value.name.trim()) return
    try {
        const res = await store.createCategory({
            name: newCat.value.name.trim(),
            icon: normalizeExpenseIcon(newCat.value.icon) || '',
            color: newCat.value.color
        })
        if (res.success) { toast.success('分类已添加 '); newCat.value = { name: '', icon: '', color: '#a29bfe' } }
        else toast.error(res.message || '添加失败')
    } catch (e) { toast.error(e.message || '添加失败') }
}
async function handleDeleteCat(id) {
    const ok = await showConfirm('删除该分类？（已有记录不受影响）', {
        title: '删除分类',
        icon: '!',
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

<style scoped lang="scss" src="@/assets/styles/views/ExpenseView.scss"></style>
