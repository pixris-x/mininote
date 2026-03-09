<template>
  <AppLayout>
    <div class="calendar-page">
      <div class="page-header">
        <h1 class="page-title">日历记事 📅</h1>
        <p class="page-sub">在日历上记录每一天的故事</p>
      </div>

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
          <div v-for="day in weekDays" :key="day" class="week-header">{{ day }}</div>
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
              'has-notes': getDayNotes(day).length > 0
            }"
            @click="selectDay(day)"
          >
            <span class="day-number">{{ day }}</span>
            <div class="day-dots">
              <span
                v-for="(note, i) in getDayNotes(day).slice(0, 3)"
                :key="i"
                class="day-dot"
                :style="{ background: note.color === '#FFFFFF' ? 'var(--theme-primary)' : note.color }"
              ></span>
            </div>
          </div>
        </div>
      </div>

      <!-- 选中日期的记事列表 -->
      <div v-if="selectedDay" class="selected-day-panel">
        <div class="selected-day-header">
          <h3>
            {{ currentYear }}年{{ currentMonth }}月{{ selectedDay }}日
            <span v-if="isToday(selectedDay)" class="today-badge">今天</span>
          </h3>
          <button class="btn btn-primary btn-sm" @click="showLinkModal = true">
            ＋ 关联记事
          </button>
        </div>

        <div v-if="dayLoading" class="loading-center" style="padding: 24px">
          <div class="loading-spinner"></div>
        </div>

        <div v-else-if="selectedDayNotes.length === 0" class="empty-state" style="padding: 24px">
          <span class="empty-icon" style="font-size:40px">📋</span>
          <p>这一天还没有记事，关联一条吧~</p>
        </div>

        <div v-else class="day-notes-list">
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
      </div>

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

const weekDays = ['日', '一', '二', '三', '四', '五', '六']
const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']

const daysInMonth = computed(() => {
  return dayjs(`${currentYear.value}-${currentMonth.value}-01`).daysInMonth()
})

const firstDayOffset = computed(() => {
  return dayjs(`${currentYear.value}-${currentMonth.value}-01`).day()
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

function truncate(str, max) {
  if (!str) return ''
  return str.length > max ? str.slice(0, max) + '...' : str
}

function formatDate(date) {
  return dayjs(date).format('MM/DD')
}

async function loadMonthData() {
  try {
    const res = await calendarApi.getMonth(currentYear.value, currentMonth.value)
    if (res.success) calendarData.value = res.data
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
  max-width: 700px;
  margin: 0 auto;
}

.page-header { margin-bottom: 20px; }

.page-title {
  font-size: 24px;
  font-weight: 800;
  color: var(--color-text);
}

.page-sub {
  font-size: 13px;
  color: var(--color-text-secondary);
  margin-top: 2px;
}

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
  aspect-ratio: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition);
  position: relative;
  gap: 3px;
  padding: 4px;
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
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.18);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 16px;
}

.modal-card {
  width: 100%;
  max-width: 440px;
  max-height: 80vh;
  overflow-y: auto;
  padding: 24px;
  animation: popIn 0.2s ease;
}

@keyframes popIn {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
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
</style>
