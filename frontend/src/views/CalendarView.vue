<template>
  <div class="calendar-page">
      <div class="page-header">
        <h1 class="page-title">
          <CalendarDays class="page-title-icon" />
          日历记事
        </h1>
        <p class="page-sub">在日历上记录每一天的故事，也不错过每一个生日</p>
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
        <button class="btn btn-outline btn-sm today-btn icon-btn-sm" @click="openBirthdayModal()">
          <Gift class="btn-icon-sm" />
          生日
        </button>
        <button class="btn btn-outline btn-sm today-btn" @click="goToday">今天</button>
      </div>

      <div class="upcoming-panel card" v-if="todayBirthdayReminders.length > 0">
        <div class="upcoming-title">
          <Gift class="inline-icon" />
          今日提醒
        </div>
        <div class="upcoming-list">
          <div
            v-for="item in todayBirthdayReminders"
            :key="`today-reminder-${item.id}-${item.occurrenceDate}-${item.offset}`"
            class="upcoming-item upcoming-reminder"
            @click="jumpToBirthdayDate(item.occurrenceDate)"
          >
            <div class="upcoming-left">
              <span class="upcoming-name">{{ item.title }}</span>
              <span class="upcoming-date">
                {{ item.offset === 0 ? '生日当天提醒' : `提前${item.offset}天提醒` }}
              </span>
            </div>
            <div class="upcoming-right">
              <span class="upcoming-badge">{{ item.daysLeft }}<em>天</em></span>
            </div>
          </div>
        </div>
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
              'has-notes': getDayNotes(day).length > 0 || getDayPlanSteps(day).length > 0 || getDayBirthdays(day).length > 0,
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
              <span
                v-for="(birthday, i) in getDayBirthdays(day).slice(0, 2)"
                :key="'b'+i"
                class="day-dot day-dot--birthday"
                :style="{ background: birthday.color || '#FF6B6B' }"
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

      <!-- 即将到来的生日 -->
      <div class="upcoming-panel card" v-if="upcomingBirthdays.length > 0">
        <div class="upcoming-title">
          <Gift class="inline-icon" />
          即将到来的生日
        </div>
        <div class="upcoming-list">
          <div
            v-for="item in upcomingBirthdays"
            :key="`birthday-${item.id}-${item.occurrenceDate}`"
            class="upcoming-item upcoming-birthday"
            @click="jumpToBirthdayDate(item.occurrenceDate)"
          >
            <div class="upcoming-left">
              <span class="upcoming-name">{{ item.title }}</span>
              <span class="upcoming-date">
                {{ dayjs(item.occurrenceDate).format('MM月DD日') }}
                <template v-if="item.isLunar"> | {{ item.lunarText }}</template>
              </span>
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
            <button class="btn btn-outline btn-sm icon-btn-sm" @click="openBirthdayModal()">
              <Gift class="btn-icon-sm" />
              新建生日
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

        <div v-else-if="selectedDayNotes.length === 0 && selectedDaySteps.length === 0 && selectedDayBirthdays.length === 0" class="empty-state" style="padding: 24px">
          <NotebookText class="empty-icon" />
          <p>这一天还没有记事</p>
        </div>

        <template v-else>
        <!-- 生日提醒 -->
        <div v-if="selectedDayBirthdays.length" class="day-birthday-list">
          <h4 class="day-section-title">
            <Gift class="section-icon" />
            生日提醒
          </h4>
          <div
            v-for="item in selectedDayBirthdays"
            :key="`selected-birthday-${item.id}`"
            class="day-birthday-item"
            :style="{ borderLeftColor: item.color || '#FF6B6B' }"
          >
            <div class="day-birthday-head">
              <span class="day-birthday-name">{{ item.title }}</span>
              <span v-if="item.isLunar" class="day-birthday-tag lunar">农历</span>
              <span class="day-birthday-tag">{{ item.repeat_type === 'yearly' ? '每年' : '单次' }}</span>
            </div>
            <div class="day-birthday-meta">
              <span>提醒：{{ formatRemindOffsets(item.remind_offsets) }}</span>
              <span v-if="item.notify_enabled">时间：{{ formatNotifyTime(item.notify_time) }}</span>
            </div>
            <div v-if="item.note" class="day-birthday-note">{{ item.note }}</div>
            <div class="day-birthday-actions">
              <button class="btn btn-ghost btn-sm" @click="openBirthdayModal(item)">编辑</button>
              <button class="btn btn-ghost btn-sm danger" @click="removeBirthday(item)">删除</button>
            </div>
          </div>
        </div>

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

      <!-- 生日提醒弹窗 -->
      <Teleport to="body">
        <div v-if="showBirthdayModal" class="modal-overlay" @click.self="closeBirthdayModal">
          <div class="modal-card card birthday-modal">
            <div class="modal-header">
              <h2 class="modal-title">
                <Gift class="section-icon" />
                {{ birthdayEditingId ? '编辑生日提醒' : '添加生日提醒' }}
              </h2>
              <button class="btn btn-ghost btn-icon icon-only-btn" @click="closeBirthdayModal" title="关闭">
                <X class="btn-icon-sm" />
              </button>
            </div>

            <div class="quick-note-form">
              <div class="form-group">
                <label class="form-label">标题 <span style="color:var(--color-danger)">*</span></label>
                <input
                  v-model="birthdayForm.title"
                  type="text"
                  class="input"
                  placeholder="例如：妈妈生日"
                  maxlength="80"
                />
              </div>

              <div class="form-group">
                <label class="form-label">日期</label>
                <input v-model="birthdayForm.solar_date" type="date" class="input" />
              </div>

              <div class="birthday-inline-row">
                <div class="form-group">
                  <label class="form-label">循环</label>
                  <select v-model="birthdayForm.repeat_type" class="input">
                    <option value="none">永不</option>
                    <option value="yearly">每年</option>
                  </select>
                </div>
                <label class="birthday-switch-row">
                  <span>农历</span>
                  <button
                    type="button"
                    class="switch-btn"
                    :class="{ active: birthdayForm.is_lunar }"
                    @click="birthdayForm.is_lunar = !birthdayForm.is_lunar"
                  >
                    <span class="switch-thumb"></span>
                  </button>
                </label>
              </div>

              <p v-if="birthdayForm.is_lunar && birthdayLunarPreview" class="birthday-preview">
                当前日期对应农历：{{ birthdayLunarPreview }}
              </p>

              <div class="birthday-notify-card">
                <div class="birthday-notify-head">
                  <span class="form-label">通知</span>
                  <button
                    type="button"
                    class="switch-btn"
                    :class="{ active: birthdayForm.notify_enabled }"
                    @click="birthdayForm.notify_enabled = !birthdayForm.notify_enabled"
                  >
                    <span class="switch-thumb"></span>
                  </button>
                </div>

                <div class="form-group">
                  <label class="form-label">时间</label>
                  <input v-model="birthdayForm.notify_time" class="input" type="time" :disabled="!birthdayForm.notify_enabled" />
                </div>

                <div class="form-group">
                  <label class="form-label">提醒（可多选）</label>
                  <div class="birthday-remind-options">
                    <label class="birthday-remind-item">
                      <input
                        type="checkbox"
                        :disabled="!birthdayForm.notify_enabled"
                        :checked="birthdayForm.remind_offsets.includes(7)"
                        @change="toggleRemindOffset(7, $event.target.checked)"
                      />
                      提前一周
                    </label>
                    <label class="birthday-remind-item">
                      <input
                        type="checkbox"
                        :disabled="!birthdayForm.notify_enabled"
                        :checked="birthdayForm.remind_offsets.includes(3)"
                        @change="toggleRemindOffset(3, $event.target.checked)"
                      />
                      提前三天
                    </label>
                    <label class="birthday-remind-item">
                      <input
                        type="checkbox"
                        :disabled="!birthdayForm.notify_enabled"
                        :checked="birthdayForm.remind_offsets.includes(0)"
                        @change="toggleRemindOffset(0, $event.target.checked)"
                      />
                      当天
                    </label>
                  </div>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">颜色</label>
                <div class="color-picker">
                  <div
                    v-for="c in BIRTHDAY_COLORS"
                    :key="c.value"
                    class="color-dot"
                    :class="{ selected: birthdayForm.color === c.value }"
                    :style="{ background: c.value }"
                    :title="c.label"
                    @click="birthdayForm.color = c.value"
                  ></div>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">备注</label>
                <textarea
                  v-model="birthdayForm.note"
                  class="input quick-note-textarea"
                  placeholder="备注（可选）"
                  rows="3"
                ></textarea>
              </div>

              <div class="quick-note-actions">
                <button class="btn btn-ghost" @click="closeBirthdayModal">取消</button>
                <button
                  class="btn btn-primary icon-btn-sm"
                  :disabled="birthdaySaving"
                  @click="saveBirthday"
                >
                  <span v-if="!birthdaySaving">{{ birthdayEditingId ? '保存修改' : '保存' }}</span>
                  <span v-else>保存中...</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </Teleport>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  CalendarDays,
  CalendarRange,
  Check,
  ChevronLeft,
  ChevronRight,
  Gift,
  Link2,
  NotebookText,
  SquarePen,
  Target,
  X
} from 'lucide-vue-next'
import dayjs from 'dayjs'
import { useNotesStore } from '@/stores/notes'
import { calendarApi } from '@/api'
import { toast } from '@/utils/toast'
import { getPlanIconComponentOrDefault } from '@/utils/plan-icons'
import { getHoliday, getLunarDayLabel, getUpcomingHolidays, preloadHolidayEngine } from '@/utils/holidays'
import {
  deriveLunarFromSolarDate,
  formatLunarText,
  getBirthdayOccurrenceDate,
  getNextBirthdayOccurrenceDate,
  getReminderEntries,
  normalizeRemindOffsets,
  preloadBirthdayEngine
} from '@/utils/birthdays'

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
const holidayEngineReady = ref(false)
const birthdayEngineReady = ref(false)

// 生日提醒
const birthdays = ref([])
const showBirthdayModal = ref(false)
const birthdaySaving = ref(false)
const birthdayEditingId = ref(null)
const birthdayForm = ref(defaultBirthdayForm())

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

const BIRTHDAY_COLORS = [
  { label: '珊瑚红', value: '#FF6B6B' },
  { label: '玫瑰粉', value: '#FF8AAE' },
  { label: '紫罗兰', value: '#A78BFA' },
  { label: '天空蓝', value: '#60A5FA' },
  { label: '薄荷绿', value: '#34D399' },
  { label: '橙色', value: '#FB923C' }
]

const weekDays = ['日', '一', '二', '三', '四', '五', '六']
const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']

const daysInMonth = computed(() => dayjs(`${currentYear.value}-${currentMonth.value}-01`).daysInMonth())
const firstDayOffset = computed(() => dayjs(`${currentYear.value}-${currentMonth.value}-01`).day())

const birthdayLunarPreview = computed(() => {
  const _ready = birthdayEngineReady.value
  if (!birthdayForm.value.is_lunar || !_ready) return ''
  const lunar = deriveLunarFromSolarDate(birthdayForm.value.solar_date)
  if (!lunar) return ''
  return formatLunarText(lunar.lunar_month, lunar.lunar_day, lunar.lunar_is_leap)
})

const birthdayMonthMap = computed(() => {
  const _ready = birthdayEngineReady.value
  void _ready

  const map = new Map()
  const monthKey = `${currentYear.value}-${String(currentMonth.value).padStart(2, '0')}`

  for (const birthday of birthdays.value) {
    const occurrenceDate = getBirthdayOccurrenceDate(birthday, currentYear.value)
    if (!occurrenceDate || !occurrenceDate.startsWith(monthKey)) continue
    if (!map.has(occurrenceDate)) {
      map.set(occurrenceDate, [])
    }
    map.get(occurrenceDate).push({
      ...birthday,
      occurrence_date: occurrenceDate,
      isLunar: Boolean(birthday.is_lunar),
      lunarText: birthday.is_lunar
        ? formatLunarText(birthday.lunar_month, birthday.lunar_day, birthday.lunar_is_leap)
        : '',
      remind_offsets: normalizeRemindOffsets(birthday.remind_offsets)
    })
  }

  for (const list of map.values()) {
    list.sort((a, b) => a.id - b.id)
  }

  return map
})

const selectedDayBirthdays = computed(() => {
  if (!selectedDay.value) return []
  return getDayBirthdays(selectedDay.value)
})

const upcomingHolidays = computed(() => {
  if (!holidayEngineReady.value) return []
  return getUpcomingHolidays(90)
})

const upcomingBirthdays = computed(() => {
  const _ready = birthdayEngineReady.value
  void _ready

  const base = dayjs().startOf('day')
  return birthdays.value
    .map((item) => {
      const occurrenceDate = getNextBirthdayOccurrenceDate(item, base)
      if (!occurrenceDate) return null
      const daysLeft = dayjs(occurrenceDate).diff(base, 'day')
      if (daysLeft < 0 || daysLeft > 120) return null
      return {
        id: item.id,
        title: item.title,
        isLunar: Boolean(item.is_lunar),
        lunarText: item.is_lunar ? formatLunarText(item.lunar_month, item.lunar_day, item.lunar_is_leap) : '',
        occurrenceDate,
        daysLeft
      }
    })
    .filter(Boolean)
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, 6)
})

const todayBirthdayReminders = computed(() => {
  const _ready = birthdayEngineReady.value
  void _ready

  const todayKey = dayjs().format('YYYY-MM-DD')
  const base = dayjs().startOf('day')
  const reminders = []

  for (const item of birthdays.value) {
    if (!item.notify_enabled) continue

    const occurrenceDates = new Set()
    const repeatType = String(item.repeat_type || 'yearly')

    if (repeatType === 'yearly') {
      occurrenceDates.add(getBirthdayOccurrenceDate(item, base.year()))
      occurrenceDates.add(getBirthdayOccurrenceDate(item, base.year() + 1))
    } else {
      const date = dayjs(item.solar_date)
      if (date.isValid()) {
        occurrenceDates.add(getBirthdayOccurrenceDate(item, date.year()))
      }
    }

    for (const occurrenceDate of occurrenceDates) {
      if (!occurrenceDate) continue
      const entries = getReminderEntries(occurrenceDate, item.remind_offsets)
      const hit = entries.find(entry => entry.reminder_date === todayKey)
      if (!hit) continue

      reminders.push({
        id: item.id,
        title: item.title,
        occurrenceDate,
        offset: hit.offset,
        daysLeft: dayjs(occurrenceDate).diff(base, 'day')
      })
    }
  }

  return reminders
    .sort((a, b) => a.daysLeft - b.daysLeft || a.offset - b.offset)
    .slice(0, 8)
})

// 获取农历日期文字（初一显示月份名，其余显示日期）
function getLunarDay(day) {
  if (!holidayEngineReady.value) return ''
  return getLunarDayLabel(currentYear.value, currentMonth.value, day)
}

function buildDateStr(year, month, day) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

// 判断是否是周末
function isWeekend(day) {
  const col = (firstDayOffset.value + day - 1) % 7
  return col === 0 || col === 6
}

// 获取某天的节日
function getDayHoliday(day) {
  if (!holidayEngineReady.value) return null
  return getHoliday(currentYear.value, currentMonth.value, day)
}

function isToday(day) {
  return day === today.date() &&
    currentMonth.value === today.month() + 1 &&
    currentYear.value === today.year()
}

function getDayNotes(day) {
  const dateStr = buildDateStr(currentYear.value, currentMonth.value, day)
  const found = calendarData.value.find(d => dayjs(d.calendar_date).format('YYYY-MM-DD') === dateStr)
  return found ? found.notes : []
}

function getDayPlanSteps(day) {
  const dateStr = buildDateStr(currentYear.value, currentMonth.value, day)
  return planStepsData.value.filter(s =>
    (s.start_date && dayjs(s.start_date).format('YYYY-MM-DD') === dateStr) ||
    (s.due_date && dayjs(s.due_date).format('YYYY-MM-DD') === dateStr)
  )
}

function getDayBirthdays(day) {
  const dateStr = buildDateStr(currentYear.value, currentMonth.value, day)
  return birthdayMonthMap.value.get(dateStr) || []
}

function truncate(str, max) {
  if (!str) return ''
  return str.length > max ? `${str.slice(0, max)}...` : str
}

function formatDate(date) {
  return dayjs(date).format('MM/DD')
}

function formatNotifyTime(raw) {
  const text = String(raw || '').trim()
  if (!text) return '--'
  if (/^\d{2}:\d{2}:\d{2}$/.test(text)) return text.slice(0, 5)
  if (/^\d{2}:\d{2}$/.test(text)) return text
  return text
}

function formatRemindOffsets(offsets = []) {
  const items = normalizeRemindOffsets(offsets)
  if (items.length === 0) return '已关闭'
  const map = { 7: '提前一周', 3: '提前三天', 0: '当天' }
  return items.map(item => map[item] || `${item}天前`).join('、')
}

function defaultBirthdayForm(dateText = null) {
  const preferredDate = dateText || (
    selectedDay.value
      ? buildDateStr(currentYear.value, currentMonth.value, selectedDay.value)
      : dayjs().format('YYYY-MM-DD')
  )

  return {
    title: '',
    solar_date: preferredDate,
    is_lunar: false,
    repeat_type: 'yearly',
    notify_enabled: true,
    notify_time: '09:00',
    remind_offsets: [0],
    color: '#FF6B6B',
    note: ''
  }
}

function toTimeInput(raw) {
  const text = String(raw || '').trim()
  if (/^\d{2}:\d{2}:\d{2}$/.test(text)) return text.slice(0, 5)
  if (/^\d{2}:\d{2}$/.test(text)) return text
  return '09:00'
}

function toApiNotifyTime(raw) {
  const text = String(raw || '').trim()
  if (/^\d{2}:\d{2}:\d{2}$/.test(text)) return text
  if (/^\d{2}:\d{2}$/.test(text)) return `${text}:00`
  return '09:00:00'
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

async function loadBirthdays() {
  try {
    const res = await calendarApi.getBirthdays()
    if (res.success) {
      birthdays.value = Array.isArray(res.data) ? res.data : []
    }
  } catch (err) {
    console.error(err)
  }
}

async function selectDay(day) {
  selectedDay.value = day
  dayLoading.value = true
  try {
    const dateStr = buildDateStr(currentYear.value, currentMonth.value, day)
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

function jumpToBirthdayDate(dateText) {
  const value = dayjs(dateText)
  if (!value.isValid()) return
  currentYear.value = value.year()
  currentMonth.value = value.month() + 1
  selectDay(value.date())
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
    const dateStr = buildDateStr(currentYear.value, currentMonth.value, selectedDay.value)
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

function openBirthdayModal(item = null) {
  if (item) {
    birthdayEditingId.value = item.id
    birthdayForm.value = {
      title: item.title || '',
      solar_date: dayjs(item.solar_date).format('YYYY-MM-DD'),
      is_lunar: Boolean(item.is_lunar),
      repeat_type: item.repeat_type || 'yearly',
      notify_enabled: Boolean(item.notify_enabled),
      notify_time: toTimeInput(item.notify_time),
      remind_offsets: normalizeRemindOffsets(item.remind_offsets),
      color: item.color || '#FF6B6B',
      note: item.note || ''
    }
  } else {
    birthdayEditingId.value = null
    birthdayForm.value = defaultBirthdayForm()
  }

  if (birthdayForm.value.notify_enabled && birthdayForm.value.remind_offsets.length === 0) {
    birthdayForm.value.remind_offsets = [0]
  }

  showBirthdayModal.value = true
}

function closeBirthdayModal() {
  showBirthdayModal.value = false
}

function toggleRemindOffset(offset, checked) {
  const list = normalizeRemindOffsets(birthdayForm.value.remind_offsets)
  let next = list

  if (checked) {
    next = normalizeRemindOffsets([...list, offset])
  } else {
    next = normalizeRemindOffsets(list.filter(item => item !== offset))
  }

  if (birthdayForm.value.notify_enabled && next.length === 0) {
    next = [0]
  }
  birthdayForm.value.remind_offsets = next
}

async function saveBirthday() {
  if (!birthdayForm.value.title.trim()) {
    toast.error('请填写生日标题')
    return
  }
  if (!dayjs(birthdayForm.value.solar_date).isValid()) {
    toast.error('请选择有效日期')
    return
  }

  birthdaySaving.value = true
  try {
    const payload = {
      title: birthdayForm.value.title.trim(),
      solar_date: dayjs(birthdayForm.value.solar_date).format('YYYY-MM-DD'),
      is_lunar: birthdayForm.value.is_lunar,
      repeat_type: birthdayForm.value.repeat_type,
      notify_enabled: birthdayForm.value.notify_enabled,
      notify_time: toApiNotifyTime(birthdayForm.value.notify_time),
      remind_offsets: birthdayForm.value.notify_enabled
        ? normalizeRemindOffsets(birthdayForm.value.remind_offsets)
        : [],
      color: birthdayForm.value.color,
      note: birthdayForm.value.note.trim() || null
    }

    if (payload.is_lunar) {
      const lunar = deriveLunarFromSolarDate(payload.solar_date)
      if (!lunar) {
        throw new Error('农历日期转换失败，请重新选择日期')
      }
      payload.lunar_month = lunar.lunar_month
      payload.lunar_day = lunar.lunar_day
      payload.lunar_is_leap = lunar.lunar_is_leap
    }

    if (birthdayEditingId.value) {
      await calendarApi.updateBirthday(birthdayEditingId.value, payload)
      toast.success('生日提醒已更新')
    } else {
      await calendarApi.createBirthday(payload)
      toast.success('生日提醒已创建')
    }

    await loadBirthdays()
    closeBirthdayModal()
  } catch (err) {
    toast.error(err.message || '保存失败')
  } finally {
    birthdaySaving.value = false
  }
}

async function removeBirthday(item) {
  if (!window.confirm(`确定删除“${item.title}”吗？`)) return
  try {
    await calendarApi.deleteBirthday(item.id)
    await loadBirthdays()
    toast.success('生日提醒已删除')
  } catch (err) {
    toast.error(err.message || '删除失败')
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
  if (!selectedDay.value) return
  const dateStr = buildDateStr(currentYear.value, currentMonth.value, selectedDay.value)
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
  if (!selectedDay.value) return
  const dateStr = buildDateStr(currentYear.value, currentMonth.value, selectedDay.value)
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

watch(() => birthdayForm.value.notify_enabled, (enabled) => {
  if (!enabled) return
  const offsets = normalizeRemindOffsets(birthdayForm.value.remind_offsets)
  if (offsets.length === 0) {
    birthdayForm.value.remind_offsets = [0]
  }
})

watch(planStepsData, () => {
  if (!selectedDay.value) return
  selectedDaySteps.value = getDayPlanSteps(selectedDay.value)
})

onMounted(async () => {
  await Promise.all([
    preloadHolidayEngine()
      .then(() => {
        holidayEngineReady.value = true
      })
      .catch((err) => {
        console.error(err)
      }),
    preloadBirthdayEngine()
      .then(() => {
        birthdayEngineReady.value = true
      })
      .catch((err) => {
        console.error(err)
      }),
    loadMonthData(),
    loadBirthdays(),
    notesStore.fetchNotes(),
    selectDay(today.date())
  ])
})
</script>

<style scoped lang="scss" src="@/assets/styles/views/CalendarView.scss"></style>

