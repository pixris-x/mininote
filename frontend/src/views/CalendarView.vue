<template>
  <AppLayout>
    <div class="calendar-page">
      <div class="page-header">
        <h1 class="page-title">
          <CalendarDays class="page-title-icon" />
          日历记事
        </h1>
        <p class="page-sub">在日历上记录每一天的故事</p>
      </div>

      <div class="calendar-layout">
        <!-- 左列：日历 + 即将到来 -->
        <div class="calendar-left">

      <!-- 月份导航 -->
      <div class="month-nav card">
        <button class="nav-arrow" @click="prevMonth" title="上一月">
          <ChevronLeft class="nav-arrow-icon" />
        </button>
        <div class="month-display">
          <span class="month-year">{{ currentYear }}</span>
          <span class="month-name">{{ monthNames[currentMonth - 1] }}</span>
        </div>
        <button class="nav-arrow" @click="nextMonth" title="下一月">
          <ChevronRight class="nav-arrow-icon" />
        </button>
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
        <div class="upcoming-title">
          <CalendarRange class="inline-icon" />
          即将到来
        </div>
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
            <button class="btn btn-primary btn-sm icon-btn-sm" @click="openQuickNote">
              <SquarePen class="btn-icon-sm" />
              新建记事
            </button>
            <button class="btn btn-outline btn-sm icon-btn-sm" @click="showLinkModal = true">
              <Link2 class="btn-icon-sm" />
              关联记事
            </button>
          </div>
        </div>

        <div v-if="dayLoading" class="loading-center" style="padding: 24px">
          <div class="loading-spinner"></div>
        </div>

        <div v-else-if="selectedDayNotes.length === 0 && selectedDaySteps.length === 0" class="empty-state" style="padding: 24px">
          <NotebookText class="empty-icon" />
          <p>这一天还没有记事</p>
        </div>

        <template v-else>
        <!-- 计划步骤列表 -->
        <div v-if="selectedDaySteps.length" class="day-plan-steps">
          <h4 class="day-section-title">
            <Target class="section-icon" />
            计划步骤
          </h4>
          <div
            v-for="step in selectedDaySteps"
            :key="step.id"
            class="day-plan-step-item"
            :style="{ borderLeftColor: step.plan_color === '#FFFFFF' ? '#6c5ce7' : step.plan_color }"
            @click="router.push(`/plans?plan=${step.plan_id}&step=${step.id}`)"
          >
            <div class="day-plan-step-head">
              <span class="day-plan-step-icon">
                <component :is="getPlanIconComponentOrDefault(step.plan_icon)" class="day-plan-step-icon-svg" />
              </span>
              <span class="day-plan-step-plan">{{ step.plan_title }}</span>
              <span class="day-plan-step-status" :class="`step-st-${step.status}`">
                {{ stepStatusLabel[step.status] || step.status }}
              </span>
            </div>
            <div class="day-plan-step-title">{{ step.title }}</div>
            <div class="day-plan-step-dates">
              <span v-if="step.start_date" class="date-item">
                <CalendarRange class="date-icon" />
                开始：{{ dayjs(step.start_date).format('YYYY-MM-DD') }}
              </span>
              <span v-if="step.due_date" class="date-item">
                <CalendarDays class="date-icon" />
                截止：{{ dayjs(step.due_date).format('YYYY-MM-DD') }}
              </span>
            </div>
          </div>
        </div>

        <!-- 记事列表 -->
        <div v-if="selectedDayNotes.length" class="day-notes-list">
          <h4 v-if="selectedDaySteps.length" class="day-section-title">
            <NotebookText class="section-icon" />
            记事
          </h4>
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
            >
              <X class="unlink-icon" />
            </button>
          </div>
        </div>
        </template>
      </div>

      <!-- 未选中日期占位 -->
      <div v-else class="no-day-selected">
        <CalendarDays class="no-day-icon" />
        <p>点击左侧日历中的某一天<br/>查看当天的记事</p>
      </div>

        </div>
      </div><!-- end calendar-layout -->

      <!-- 快速新建记事弹窗 -->
      <Teleport to="body">
        <div v-if="showQuickNoteModal" class="modal-overlay" @click.self="closeQuickNote">
          <div class="modal-card card">
            <div class="modal-header">
              <h2 class="modal-title">
                <SquarePen class="section-icon" />
                新建记事 · {{ currentMonth }}月{{ selectedDay }}日
              </h2>
              <button class="btn btn-ghost btn-icon icon-only-btn" @click="closeQuickNote" title="关闭">
                <X class="btn-icon-sm" />
              </button>
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
                  class="btn btn-primary icon-btn-sm"
                  :disabled="!quickNoteForm.title.trim() || quickNoteSaving"
                  @click="saveQuickNote"
                >
                  <span v-if="!quickNoteSaving" class="btn-content">
                    <Check class="btn-icon-sm" />
                    保存并关联
                  </span>
                  <span v-else>保存中...</span>
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
              <h2 class="modal-title">
                <Link2 class="section-icon" />
                关联到 {{ currentMonth }}月{{ selectedDay }}日
              </h2>
              <button class="btn btn-ghost btn-icon icon-only-btn" @click="showLinkModal = false" title="关闭">
                <X class="btn-icon-sm" />
              </button>
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
                <Check v-if="isLinked(note.id)" class="link-check" />
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
import { CalendarDays, CalendarRange, Check, ChevronLeft, ChevronRight, Link2, NotebookText, SquarePen, Target, X } from 'lucide-vue-next'
import AppLayout from '@/components/AppLayout.vue'
import { useNotesStore } from '@/stores/notes'
import { calendarApi } from '@/api'
import { toast } from '@/utils/toast'
import { getPlanIconComponentOrDefault } from '@/utils/plan-icons'
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
    toast.success('记事已创建并关联到日历')
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
      toast.success('已关联到日历')
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

<style scoped lang="scss" src="@/assets/styles/views/CalendarView.scss"></style>
