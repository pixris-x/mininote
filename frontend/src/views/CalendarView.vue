<template>
  <AppLayout>
    <div class="calendar-page">
      <div class="page-header">
        <h1 class="page-title">日历记事 📅</h1>
        <p class="page-sub">在日历上记录每一天的故事</p>
      </div>

      <div class="calendar-layout">
        <!-- 左列：日历 + 即将到来 -->
        <div class="calendar-left">

      <!-- 月份导航 -->
      <div class="month-nav card">
        <button class="nav-arrow" @click="prevMonth">‹</button>
        <div class="month-display">
          <span class="month-year">{{ currentYear }}</span>
          <span class="month-name">{{ monthNames[currentMonth - 1] }}</span>
        </div>
        <button class="nav-arrow" @click="nextMonth">›</button>
        <button class="btn btn-outline btn-sm today-btn" @click="goToday">今天</button>
      </div>

      <!-- 日历网格 -->
      <div class="calendar-grid card">
        <!-- 星期表头 -->
        <div class="week-headers">
          <div
            v-for="(day, idx) in weekDays"
            :key="day"
            class="week-header"
            :class="{ 'weekend-header': idx === 0 || idx === 6 }"
          >{{ day }}</div>
        </div>

        <!-- 日期格子 -->
        <div class="days-grid">
          <!-- 填充前置空白 -->
          <div v-for="n in firstDayOffset" :key="`empty-${n}`" class="day-cell empty"></div>

          <!-- 实际日期 -->
          <div
            v-for="day in daysInMonth"
            :key="day"
            class="day-cell"
            :class="{
              today: isToday(day),
              selected: selectedDay === day,
              'has-notes': getDayNotes(day).length > 0 || getDayPlanSteps(day).length > 0,
              'is-weekend': isWeekend(day),
              [`holiday-${getDayHoliday(day)?.type}`]: !!getDayHoliday(day)
            }"
            @click="selectDay(day)"
          >
            <span class="day-number">{{ day }}</span>
            <span v-if="getDayHoliday(day)" class="day-holiday">{{ getDayHoliday(day).name }}</span>
            <span v-else class="day-lunar">{{ getLunarDay(day) }}</span>
            <div class="day-dots">
              <span
                v-for="(note, i) in getDayNotes(day).slice(0, 3)"
                :key="'n'+i"
                class="day-dot"
                :style="{ background: note.color === '#FFFFFF' ? 'var(--theme-primary)' : note.color }"
              ></span>
              <span
                v-for="(step, i) in getDayPlanSteps(day).slice(0, 2)"
                :key="'s'+i"
                class="day-dot day-dot--plan"
                :style="{ background: step.plan_color === '#FFFFFF' ? '#6c5ce7' : step.plan_color }"
              ></span>
            </div>
          </div>
        </div>
      </div>

      <!-- 即将来到的节日 -->
      <div class="upcoming-panel card" v-if="upcomingHolidays.length > 0">
        <div class="upcoming-title">🗓️ 即将到来</div>
        <div class="upcoming-list">
          <div
            v-for="item in upcomingHolidays"
            :key="item.date"
            class="upcoming-item"
            :class="`upcoming-${item.type}`"
          >
            <div class="upcoming-left">
              <span class="upcoming-name">{{ item.name }}</span>
              <span class="upcoming-date">{{ item.month }}月{{ item.day }}日 | 周{{ item.weekDay }}</span>
            </div>
            <div class="upcoming-right">
              <span v-if="item.daysLeft === 0" class="upcoming-badge today">今天</span>
              <span v-else class="upcoming-badge">{{ item.daysLeft }}<em>天</em></span>
            </div>
          </div>
        </div>
      </div>

        </div>
        <!-- 右列：记事详情 -->
        <div class="calendar-right">

      <!-- 选中日期的记事列表 -->
      <div v-if="selectedDay" class="selected-day-panel">
        <div class="selected-day-header">
          <h3>
            {{ currentYear }}年{{ currentMonth }}月{{ selectedDay }}日
            <span v-if="isToday(selectedDay)" class="today-badge">今天</span>
          </h3>
          <div class="header-actions">
            <button class="btn btn-primary btn-sm" @click="openQuickNote">
              ✏️ 新建记事
            </button>
            <button class="btn btn-outline btn-sm" @click="showLinkModal = true">
              🔗 关联记事
            </button>
          </div>
        </div>

        <div v-if="dayLoading" class="loading-center" style="padding: 24px">
          <div class="loading-spinner"></div>
        </div>

        <div v-else-if="selectedDayNotes.length === 0 && selectedDaySteps.length === 0" class="empty-state" style="padding: 24px">
          <span class="empty-icon" style="font-size:40px">📋</span>
          <p>这一天还没有记事</p>
        </div>

        <template v-else>
        <!-- 计划步骤列表 -->
        <div v-if="selectedDaySteps.length" class="day-plan-steps">
          <h4 class="day-section-title">🎯 计划步骤</h4>
          <div
            v-for="step in selectedDaySteps"
            :key="step.id"
            class="day-plan-step-item"
            :style="{ borderLeftColor: step.plan_color === '#FFFFFF' ? '#6c5ce7' : step.plan_color }"
            @click="router.push(`/plans?plan=${step.plan_id}&step=${step.id}`)"
          >
            <div class="day-plan-step-head">
              <span class="day-plan-step-icon">{{ step.plan_icon }}</span>
              <span class="day-plan-step-plan">{{ step.plan_title }}</span>
              <span class="day-plan-step-status" :class="`step-st-${step.status}`">
                {{ stepStatusLabel[step.status] || step.status }}
              </span>
            </div>
            <div class="day-plan-step-title">{{ step.title }}</div>
            <div class="day-plan-step-dates">
              <span v-if="step.start_date">🗓️ 开始：{{ dayjs(step.start_date).format('YYYY-MM-DD') }}</span>
              <span v-if="step.due_date">📅 截止：{{ dayjs(step.due_date).format('YYYY-MM-DD') }}</span>
            </div>
          </div>
        </div>

        <!-- 记事列表 -->
        <div v-if="selectedDayNotes.length" class="day-notes-list">
          <h4 v-if="selectedDaySteps.length" class="day-section-title">📝 记事</h4>
          <div
            v-for="note in selectedDayNotes"
            :key="note.id"
            class="day-note-item"
            :style="{ borderLeftColor: note.color === '#FFFFFF' ? 'var(--theme-primary)' : note.color }"
            @click="router.push(`/notes/${note.id}`)"
          >
            <div class="day-note-title">{{ note.title }}</div>
            <div v-if="note.content" class="day-note-content">{{ truncate(note.content, 60) }}</div>
            <button
              class="unlink-btn"
              @click.stop="unlinkNote(note.id)"
              title="取消关联"
            >✕</button>
          </div>
        </div>
        </template>
      </div>

      <!-- 未选中日期占位 -->
      <div v-else class="no-day-selected">
        <span style="font-size:48px">📅</span>
        <p>点击左侧日历中的某一天<br/>查看当天的记事</p>
      </div>

        </div>
      </div><!-- end calendar-layout -->

      <!-- 快速新建记事弹窗 -->
      <Teleport to="body">
        <div v-if="showQuickNoteModal" class="modal-overlay" @click.self="closeQuickNote">
          <div class="modal-card card">
            <div class="modal-header">
              <h2>✏️ 新建记事 · {{ currentMonth }}月{{ selectedDay }}日</h2>
              <button class="btn btn-ghost btn-icon" @click="closeQuickNote">✕</button>
            </div>

            <div class="quick-note-form">
              <div class="form-group">
                <label class="form-label">标题 <span style="color:var(--color-danger)">*</span></label>
                <input
                  v-model="quickNoteForm.title"
                  type="text"
                  class="input"
                  placeholder="记事标题..."
                  maxlength="100"
                  autofocus
                  @keydown.enter.prevent="saveQuickNote"
                />
              </div>

              <div class="form-group">
                <label class="form-label">内容</label>
                <textarea
                  v-model="quickNoteForm.content"
                  class="input quick-note-textarea"
                  placeholder="记事内容（可选）..."
                  rows="4"
                ></textarea>
              </div>

              <div class="form-group">
                <label class="form-label">颜色</label>
                <div class="color-picker">
                  <div
                    v-for="c in NOTE_COLORS"
                    :key="c.value"
                    class="color-dot"
                    :class="{ selected: quickNoteForm.color === c.value }"
                    :style="{ background: c.value, border: c.value === '#FFFFFF' ? '1px solid #ddd' : 'none' }"
                    :title="c.label"
                    @click="quickNoteForm.color = c.value"
                  ></div>
                </div>
              </div>

              <div class="quick-note-actions">
                <button class="btn btn-ghost" @click="closeQuickNote">取消</button>
                <button
                  class="btn btn-primary"
                  :disabled="!quickNoteForm.title.trim() || quickNoteSaving"
                  @click="saveQuickNote"
                >
                  {{ quickNoteSaving ? '保存中...' : '✓ 保存并关联' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </Teleport>

      <!-- 关联记事弹窗 -->
      <Teleport to="body">
        <div v-if="showLinkModal" class="modal-overlay" @click.self="showLinkModal = false">
          <div class="modal-card card">
            <div class="modal-header">
              <h2>🔗 关联到 {{ currentMonth }}月{{ selectedDay }}日</h2>
              <button class="btn btn-ghost btn-icon" @click="showLinkModal = false">✕</button>
            </div>

            <input
              v-model="linkSearch"
              type="text"
              class="input"
              placeholder="搜索记事..."
              style="margin-bottom: 14px"
            />

            <div class="link-notes-list">
              <div
                v-for="note in filteredLinkNotes"
                :key="note.id"
                class="link-note-item"
                :class="{ linked: isLinked(note.id) }"
                @click="toggleLink(note)"
              >
                <div class="link-note-color" :style="{ background: note.color === '#FFFFFF' ? '#eee' : note.color }"></div>
                <div class="link-note-info">
                  <div class="link-note-title">{{ note.title }}</div>
                  <div class="link-note-date">{{ formatDate(note.updated_at) }}</div>
                </div>
                <span v-if="isLinked(note.id)" class="link-check">✅</span>
              </div>
              <div v-if="filteredLinkNotes.length === 0" class="empty-state" style="padding: 20px">
                <p>没有找到记事</p>
              </div>
            </div>
          </div>
        </div>
      </Teleport>
    </div>
  </AppLayout>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import AppLayout from '@/components/AppLayout.vue'
import { useNotesStore } from '@/stores/notes'
import { calendarApi } from '@/api'
import { toast } from '@/utils/toast'
import dayjs from 'dayjs'
import { getHoliday, getUpcomingHolidays } from '@/utils/holidays'
import { Solar } from 'lunar-javascript'

const router = useRouter()
const notesStore = useNotesStore()

const today = dayjs()
const currentYear = ref(today.year())
const currentMonth = ref(today.month() + 1)
const selectedDay = ref(today.date())
const calendarData = ref([])
const selectedDayNotes = ref([])
const dayLoading = ref(false)
const showLinkModal = ref(false)
const linkSearch = ref('')
const showQuickNoteModal = ref(false)
const quickNoteSaving = ref(false)
const quickNoteForm = ref({ title: '', content: '', color: '#FFFFFF' })

// 计划步骤日历集成
const planStepsData = ref([])
const selectedDaySteps = ref([])
const stepStatusLabel = { pending: '待开始', in_progress: '进行中', completed: '已完成', skipped: '已跳过' }

const NOTE_COLORS = [
  { label: '白色', value: '#FFFFFF' },
  { label: '粉色', value: '#FFD6E0' },
  { label: '薄荷', value: '#D4F5E9' },
  { label: '薰衣草', value: '#E4E8F8' },
  { label: '蜜桃', value: '#FFE8D6' },
  { label: '柠檬', value: '#FFF8D6' },
  { label: '天蓝', value: '#D6EEFF' }
]

const weekDays = ['日', '一', '二', '三', '四', '五', '六']
const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']

const daysInMonth = computed(() => {
  return dayjs(`${currentYear.value}-${currentMonth.value}-01`).daysInMonth()
})

const firstDayOffset = computed(() => {
  return dayjs(`${currentYear.value}-${currentMonth.value}-01`).day()
})

// 获取农历日期文字（初一显示月份名，其余显示日期）
function getLunarDay(day) {
  try {
    const lunar = Solar.fromYmd(currentYear.value, currentMonth.value, day).getLunar()
    const lunarDay = lunar.getDay()
    if (lunarDay === 1) {
      // 初一显示农历月份
      return lunar.getMonthInChinese() + '月'
    }
    return lunar.getDayInChinese()
  } catch {
    return ''
  }
}

// 判断是否是周末
function isWeekend(day) {
  const col = (firstDayOffset.value + day - 1) % 7
  return col === 0 || col === 6
}

// 获取某天的节日
function getDayHoliday(day) {
  return getHoliday(currentYear.value, currentMonth.value, day)
}

// 即将到来的节日（始终基于今天往后计算，与当前月份无关）
const upcomingHolidays = computed(() => {
  return getUpcomingHolidays(90)
})

function isToday(day) {
  return day === today.date() &&
    currentMonth.value === today.month() + 1 &&
    currentYear.value === today.year()
}

function getDayNotes(day) {
  const dateStr = `${currentYear.value}-${String(currentMonth.value).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  const found = calendarData.value.find(d => {
    return dayjs(d.calendar_date).format('YYYY-MM-DD') === dateStr
  })
  return found ? found.notes : []
}

function getDayPlanSteps(day) {
  const dateStr = `${currentYear.value}-${String(currentMonth.value).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  return planStepsData.value.filter(s =>
    (s.start_date && dayjs(s.start_date).format('YYYY-MM-DD') === dateStr) ||
    (s.due_date && dayjs(s.due_date).format('YYYY-MM-DD') === dateStr)
  )
}

function truncate(str, max) {
  if (!str) return ''
  return str.length > max ? str.slice(0, max) + '...' : str
}

function formatDate(date) {
  return dayjs(date).format('MM/DD')
}

async function loadMonthData() {
  try {
    const [calRes, stepRes] = await Promise.all([
      calendarApi.getMonth(currentYear.value, currentMonth.value),
      calendarApi.getPlanSteps(currentYear.value, currentMonth.value)
    ])
    if (calRes.success) calendarData.value = calRes.data
    if (stepRes.success) planStepsData.value = stepRes.data
  } catch (err) {
    console.error(err)
  }
}

async function selectDay(day) {
  selectedDay.value = day
  dayLoading.value = true
  try {
    const dateStr = `${currentYear.value}-${String(currentMonth.value).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const res = await calendarApi.getDay(dateStr)
    if (res.success) selectedDayNotes.value = res.data
    selectedDaySteps.value = getDayPlanSteps(day)
  } catch (err) {
    console.error(err)
  } finally {
    dayLoading.value = false
  }
}

function prevMonth() {
  if (currentMonth.value === 1) {
    currentMonth.value = 12
    currentYear.value--
  } else {
    currentMonth.value--
  }
  selectedDay.value = null
}

function nextMonth() {
  if (currentMonth.value === 12) {
    currentMonth.value = 1
    currentYear.value++
  } else {
    currentMonth.value++
  }
  selectedDay.value = null
}

function goToday() {
  currentYear.value = today.year()
  currentMonth.value = today.month() + 1
  selectedDay.value = today.date()
  selectDay(today.date())
}

// 快速新建记事
function openQuickNote() {
  quickNoteForm.value = { title: '', content: '', color: '#FFFFFF' }
  showQuickNoteModal.value = true
}

function closeQuickNote() {
  showQuickNoteModal.value = false
}

async function saveQuickNote() {
  if (!quickNoteForm.value.title.trim()) return
  if (!selectedDay.value) return
  quickNoteSaving.value = true
  try {
    const createRes = await notesStore.createNote({
      title: quickNoteForm.value.title.trim(),
      content: quickNoteForm.value.content.trim() || null,
      color: quickNoteForm.value.color
    })
    if (!createRes.success) throw new Error(createRes.message || '创建失败')
    const newNote = createRes.data
    const dateStr = `${currentYear.value}-${String(currentMonth.value).padStart(2, '0')}-${String(selectedDay.value).padStart(2, '0')}`
    await calendarApi.linkNote(newNote.id, dateStr)
    selectedDayNotes.value.push(newNote)
    await loadMonthData()
    closeQuickNote()
    toast.success('记事已创建并关联到日历 ✨')
  } catch (err) {
    toast.error(err.message)
  } finally {
    quickNoteSaving.value = false
  }
}

// 关联逻辑
const filteredLinkNotes = computed(() => {
  const q = linkSearch.value.toLowerCase()
  return notesStore.notes.filter(n =>
    !q || n.title.toLowerCase().includes(q) || (n.content || '').toLowerCase().includes(q)
  )
})

function isLinked(noteId) {
  return selectedDayNotes.value.some(n => n.id === noteId)
}

async function toggleLink(note) {
  const dateStr = `${currentYear.value}-${String(currentMonth.value).padStart(2, '0')}-${String(selectedDay.value).padStart(2, '0')}`
  try {
    if (isLinked(note.id)) {
      await calendarApi.unlinkNote(note.id, dateStr)
      selectedDayNotes.value = selectedDayNotes.value.filter(n => n.id !== note.id)
      toast.info('已取消关联')
    } else {
      await calendarApi.linkNote(note.id, dateStr)
      selectedDayNotes.value.push(note)
      toast.success('已关联到日历 ✨')
    }
    await loadMonthData()
  } catch (err) {
    toast.error(err.message)
  }
}

async function unlinkNote(noteId) {
  const dateStr = `${currentYear.value}-${String(currentMonth.value).padStart(2, '0')}-${String(selectedDay.value).padStart(2, '0')}`
  try {
    await calendarApi.unlinkNote(noteId, dateStr)
    selectedDayNotes.value = selectedDayNotes.value.filter(n => n.id !== noteId)
    await loadMonthData()
    toast.info('已取消关联')
  } catch (err) {
    toast.error(err.message)
  }
}

watch([currentYear, currentMonth], loadMonthData)

onMounted(async () => {
  await Promise.all([
    loadMonthData(),
    notesStore.fetchNotes(),
    selectDay(today.date())
  ])
})
</script>

<style scoped>
.calendar-page {
  padding: 24px 20px;
  max-width: 1100px;
  margin: 0 auto;
}

/* ===== 两栏布局（PC端） ===== */
.calendar-layout {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.calendar-left {
  width: 100%;
}

.calendar-right {
  width: 100%;
}

/* 未选中占位 */
.no-day-selected {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  padding: 48px 20px;
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: var(--color-text-secondary);
  text-align: center;
  font-size: 14px;
  line-height: 1.8;
  min-height: 200px;
}

@media (min-width: 800px) {
  .calendar-layout {
    flex-direction: row;
    align-items: flex-start;
  }

  .calendar-left {
    flex: 0 0 520px;
    min-width: 0;
  }

  .calendar-right {
    flex: 1;
    min-width: 0;
    position: sticky;
    top: 20px;
  }

  /* PC 端右侧详情面板撑满高度 */
  .selected-day-panel {
    min-height: 300px;
  }
}

.page-header { margin-bottom: 20px; } /* 局部覆盖全局 24px */

/* 月份导航 */
.month-nav {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  margin-bottom: 12px;
  border-radius: var(--radius-lg);
}

.nav-arrow {
  background: var(--theme-primary-light);
  border: none;
  border-radius: var(--radius-full);
  width: 36px;
  height: 36px;
  font-size: 20px;
  cursor: pointer;
  color: var(--theme-primary-dark);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition);
  flex-shrink: 0;
}

.nav-arrow:hover {
  background: var(--theme-primary);
  color: white;
}

.month-display {
  flex: 1;
  text-align: center;
}

.month-year {
  font-size: 14px;
  color: var(--color-text-secondary);
  margin-right: 4px;
}

.month-name {
  font-size: 20px;
  font-weight: 800;
  color: var(--color-text);
}

.today-btn { flex-shrink: 0; }

/* 日历网格 */
.calendar-grid {
  padding: 16px;
  margin-bottom: 16px;
  border-radius: var(--radius-lg);
}

.week-headers {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  margin-bottom: 8px;
}

.week-header {
  text-align: center;
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-secondary);
  padding: 6px;
}

.days-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
}

.day-cell {
  min-height: 62px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding-top: 6px;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition);
  position: relative;
  gap: 2px;
  padding: 4px 2px;
}

.day-cell:not(.empty):hover {
  background: var(--theme-primary-light);
}

.day-cell.today .day-number {
  background: var(--theme-primary-dark);
  color: white;
  border-radius: var(--radius-full);
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.day-cell.selected {
  background: var(--theme-primary-light);
  border: 2px solid var(--theme-primary);
}

.day-number {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text);
  line-height: 1;
  min-width: 24px;
  text-align: center;
}

.day-dots {
  display: flex;
  gap: 2px;
  flex-wrap: wrap;
  justify-content: center;
}

.day-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  flex-shrink: 0;
}

/* 选中日期面板 */
.selected-day-panel {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  padding: 20px;
  box-shadow: var(--shadow-sm);
}

.selected-day-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 8px;
}

.selected-day-header h3 {
  font-size: 16px;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 8px;
}

.today-badge {
  font-size: 11px;
  background: var(--theme-primary);
  color: white;
  border-radius: var(--radius-full);
  padding: 2px 8px;
  font-weight: 600;
}

.loading-center {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 24px;
  color: var(--color-text-secondary);
}

.day-notes-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.day-note-item {
  padding: 12px 16px;
  border-radius: var(--radius-md);
  border-left: 4px solid var(--theme-primary);
  background: var(--color-bg);
  cursor: pointer;
  transition: all var(--transition);
  position: relative;
  padding-right: 36px;
}

.day-note-item:hover {
  transform: translateX(4px);
  box-shadow: var(--shadow-sm);
}

.day-note-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 2px;
}

.day-note-content {
  font-size: 12px;
  color: var(--color-text-secondary);
}

.unlink-btn {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  color: var(--color-text-light);
  font-size: 12px;
  padding: 4px;
  border-radius: var(--radius-sm);
  transition: all var(--transition);
}

.unlink-btn:hover {
  background: #FFE0E0;
  color: #C0392B;
}

/* 弹窗 */
.modal-card {
  width: 100%;
  max-width: 440px;
  max-height: 80vh;
  overflow-y: auto;
  padding: 24px;
  animation: popIn 0.2s ease;
}

.modal-header {
  margin-bottom: 16px; /* 局部覆盖全局 20px */
}

.modal-header h2 {
  font-size: 16px;
  font-weight: 700;
}

.link-notes-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.link-note-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background var(--transition);
  border: 2px solid transparent;
}

.link-note-item:hover {
  background: var(--color-bg);
}

.link-note-item.linked {
  border-color: var(--theme-primary);
  background: var(--theme-primary-light);
}

.link-note-color {
  width: 12px;
  height: 36px;
  border-radius: 4px;
  flex-shrink: 0;
}

.link-note-info { flex: 1; }

.link-note-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
}

.link-note-date {
  font-size: 12px;
  color: var(--color-text-secondary);
}

/* ===== 周末加深 ===== */
.week-header.weekend-header {
  color: #e8698a;
  font-weight: 700;
}

.day-cell.is-weekend {
  background: rgba(255, 182, 193, 0.08);
}

.day-cell.is-weekend .day-number {
  color: #e8698a;
}

.day-cell.is-weekend.today .day-number {
  color: #fff;
}

/* ===== 节日标签 ===== */
.day-holiday {
  font-size: 11px;
  line-height: 1;
  white-space: nowrap;
  overflow: hidden;
  max-width: 100%;
  text-overflow: ellipsis;
}

.holiday-holiday .day-holiday { color: #e8698a; font-weight: 600; }
.holiday-festival .day-holiday { color: #a78bfa; font-weight: 500; }
.holiday-solar .day-holiday { color: #34c68a; font-weight: 500; }

/* 农历日期 */
.day-lunar {
  font-size: 10px;
  line-height: 1;
  color: var(--color-text-secondary);
  white-space: nowrap;
  overflow: hidden;
  max-width: 100%;
  text-overflow: ellipsis;
  text-align: center;
}

.is-weekend .day-lunar {
  color: rgba(232, 105, 138, 0.6);
}

/* ===== 即将到来的节日面板 ===== */
.upcoming-panel {
  padding: 16px 20px;
  margin-bottom: 16px;
  border-radius: var(--radius-lg);
}

.upcoming-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--color-text);
  margin-bottom: 12px;
}

.upcoming-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.upcoming-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-radius: var(--radius-md);
  background: var(--color-bg);
  border-left: 3px solid #ddd;
}

.upcoming-holiday { border-left-color: #e8698a; }
.upcoming-festival { border-left-color: #a78bfa; }
.upcoming-solar { border-left-color: #34c68a; }

.upcoming-left {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.upcoming-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
}

.upcoming-date {
  font-size: 12px;
  color: var(--color-text-secondary);
}

.upcoming-right { flex-shrink: 0; }

.upcoming-badge {
  display: inline-flex;
  align-items: baseline;
  gap: 1px;
  font-size: 20px;
  font-weight: 800;
  color: var(--theme-primary-dark);
  min-width: 40px;
  justify-content: flex-end;
}

.upcoming-badge em {
  font-style: normal;
  font-size: 12px;
  font-weight: 500;
  color: var(--color-text-secondary);
}

.upcoming-badge.today {
  font-size: 13px;
  background: var(--theme-primary);
  color: #fff;
  border-radius: var(--radius-full);
  padding: 2px 10px;
}

/* ===== 日期头部按钮组 ===== */
.header-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

/* ===== 快速新建记事表单 ===== */
.quick-note-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.quick-note-textarea {
  resize: vertical;
  min-height: 90px;
}

.color-picker {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.color-dot {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  cursor: pointer;
  transition: transform 0.15s, box-shadow 0.15s;
  box-shadow: 0 1px 3px rgba(0,0,0,0.15);
}

.color-dot:hover {
  transform: scale(1.15);
}

.color-dot.selected {
  transform: scale(1.2);
  box-shadow: 0 0 0 3px var(--theme-primary);
}

.quick-note-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 4px;
}

/* 日历上的计划步骤圆点 */
.day-dot--plan {
  border-radius: 2px;
}

/* 计划步骤 Day Panel */
.day-section-title {
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--color-text-secondary);
  margin: 0 0 8px;
  padding: 0 4px;
}

.day-plan-steps {
  margin-bottom: 16px;
}

.day-plan-step-item {
  padding: 10px 14px;
  background: var(--color-surface);
  border-left: 3px solid #6c5ce7;
  border-radius: 8px;
  cursor: pointer;
  margin-bottom: 8px;
  transition: background 0.15s;
}

.day-plan-step-item:hover {
  background: var(--color-bg);
}

.day-plan-step-head {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
}

.day-plan-step-icon {
  font-size: 0.9rem;
}

.day-plan-step-plan {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.day-plan-step-status {
  font-size: 0.7rem;
  padding: 1px 6px;
  border-radius: 8px;
  font-weight: 600;
}

.step-st-pending { background: #f0f0f0; color: #888; }
.step-st-in_progress { background: #e4e8f8; color: #6c5ce7; }
.step-st-completed { background: #d4f5e9; color: #27ae60; }
.step-st-skipped { background: #fff8d6; color: #e17055; }

.day-plan-step-title {
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--color-text);
}

.day-plan-step-dates {
  display: flex;
  gap: 10px;
  font-size: 0.72rem;
  color: var(--color-text-secondary);
  margin-top: 4px;
}
</style>
