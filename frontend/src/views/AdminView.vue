<template>
  <div class="admin-page">
    <!-- 顶部导航 -->
    <header class="admin-header">
      <div class="header-left">
        <Flower2 class="logo-icon" />
        <span class="logo-text">Mini Note</span>
        <span class="admin-badge">
          <Crown class="badge-icon" />
          管理面板
        </span>
      </div>
      <div class="header-right">
        <span class="admin-user">{{ userStore.user?.nickname }}</span>
        <button class="btn btn-ghost btn-sm" @click="$router.push('/notes')">返回应用</button>
        <button class="btn btn-ghost btn-sm icon-text-btn" @click="handleLogout">
          <LogOut class="btn-icon-inline" />
          <span>退出</span>
        </button>
      </div>
    </header>

    <div class="admin-body">
      <!-- 侧边菜单 -->
      <aside class="admin-sidebar">
        <nav>
          <button
            v-for="tab in tabs"
            :key="tab.id"
            class="side-item"
            :class="{ active: activeTab === tab.id }"
            @click="activeTab = tab.id"
          >
            <component :is="tab.icon" class="side-item-icon" />
            <span>{{ tab.label }}</span>
          </button>
        </nav>
      </aside>

      <!-- 主内容 -->
      <main class="admin-main">
        <nav class="mobile-tabs" aria-label="管理员菜单">
          <button
            v-for="tab in tabs"
            :key="`mobile-${tab.id}`"
            class="mobile-tab-item"
            :class="{ active: activeTab === tab.id }"
            @click="activeTab = tab.id"
          >
            <component :is="tab.icon" class="side-item-icon" />
            <span>{{ tab.label }}</span>
          </button>
        </nav>

        <!-- 概览 Tab -->
        <template v-if="activeTab === 'overview'">
          <div class="section-title">
            <ChartColumn class="section-icon" />
            数据概览
          </div>

          <div v-if="statsLoading" class="loading-center"><div class="loading-spinner"></div></div>

          <template v-else-if="stats">
            <!-- 统计卡片 -->
            <div class="stat-cards">
              <div v-for="card in statCards" :key="card.label" class="stat-card" :style="{ borderTopColor: card.color }">
                <component :is="card.icon" class="stat-icon" />
                <div class="stat-values">
                  <div class="stat-main">{{ card.main }}</div>
                  <div class="stat-sub">{{ card.sub }}</div>
                </div>
                <div class="stat-label">{{ card.label }}</div>
              </div>
            </div>

            <!-- 趋势图（近7天）-->
            <div class="trend-row">
              <div class="trend-card card">
                <div class="trend-title">
                  <ChartLine class="section-icon-sm" />
                  近7天记事新增
                </div>
                <div class="bar-chart">
                  <div v-if="stats.notes_trend.length === 0" class="chart-empty">暂无数据</div>
                  <template v-else>
                    <div
                      v-for="item in filledTrend(stats.notes_trend)"
                      :key="item.date"
                      class="bar-item"
                    >
                      <div class="bar-wrap">
                        <div
                          class="bar"
                          :style="{ height: barHeight(item.count, stats.notes_trend) + 'px', background: '#FFB3C6' }"
                          :title="`${item.date}: ${item.count} 条`"
                        ></div>
                      </div>
                      <div class="bar-label">{{ shortDate(item.date) }}</div>
                      <div class="bar-val">{{ item.count }}</div>
                    </div>
                  </template>
                </div>
              </div>

              <div class="trend-card card">
                <div class="trend-title">
                  <UserPlus class="section-icon-sm" />
                  近7天新增用户
                </div>
                <div class="bar-chart">
                  <div v-if="stats.users_trend.length === 0" class="chart-empty">暂无数据</div>
                  <template v-else>
                    <div
                      v-for="item in filledTrend(stats.users_trend)"
                      :key="item.date"
                      class="bar-item"
                    >
                      <div class="bar-wrap">
                        <div
                          class="bar"
                          :style="{ height: barHeight(item.count, stats.users_trend) + 'px', background: '#B5EAD7' }"
                          :title="`${item.date}: ${item.count} 人`"
                        ></div>
                      </div>
                      <div class="bar-label">{{ shortDate(item.date) }}</div>
                      <div class="bar-val">{{ item.count }}</div>
                    </div>
                  </template>
                </div>
              </div>
            </div>

            <!-- 日志级别分布 -->
            <div class="card" style="padding: 20px; margin-bottom: 16px">
              <div class="trend-title">
                <Logs class="section-icon-sm" />
                日志级别分布
              </div>
              <div class="level-dist">
                <div v-for="item in stats.log_level_stats" :key="item.level" class="level-item">
                  <span class="level-dot" :class="`level-${item.level}`"></span>
                  <span class="level-name">{{ levelLabel(item.level) }}</span>
                  <div class="level-bar-wrap">
                    <div
                      class="level-bar"
                      :class="`level-bar-${item.level}`"
                      :style="{ width: levelBarWidth(item.count) + '%' }"
                    ></div>
                  </div>
                  <span class="level-count">{{ item.count }}</span>
                </div>
                <div v-if="stats.log_level_stats.length === 0" class="chart-empty">暂无日志</div>
              </div>
            </div>

            <!-- 最近注册用户 -->
            <div class="card" style="padding: 20px">
              <div class="trend-title">
                <UserRoundPlus class="section-icon-sm" />
                最近注册用户
              </div>
              <table class="mini-table">
                <thead>
                  <tr>
                    <th>用户名</th>
                    <th>昵称</th>
                    <th>注册时间</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="u in stats.recent_users" :key="u.id">
                    <td>
                      <span class="user-avatar" :style="{ background: u.avatar_color }">
                        {{ (u.nickname || u.username).charAt(0).toUpperCase() }}
                      </span>
                      @{{ u.username }}
                    </td>
                    <td>{{ u.nickname || '-' }}</td>
                    <td>{{ formatDate(u.created_at) }}</td>
                  </tr>
                  <tr v-if="stats.recent_users.length === 0">
                    <td colspan="3" style="text-align:center;color:var(--color-text-secondary)">暂无用户</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </template>
        </template>

        <!-- 日志 Tab -->
        <template v-else-if="activeTab === 'logs'">
          <div class="section-header">
            <div class="section-title" style="margin-bottom:0">
              <Logs class="section-icon" />
              系统日志
            </div>
            <div class="log-actions">
              <AppSelect
                v-model="logFilter.level"
                class="log-level-select"
                :options="logLevelOptions"
                @change="fetchLogs(1)"
              />
              <input
                v-model="logFilter.search"
                type="text"
                class="input"
                style="width:200px"
                placeholder="搜索消息/路由..."
                @input="debounceFetchLogs"
              />
              <button class="btn btn-outline btn-sm icon-text-btn" @click="showCleanModal = true">
                <Trash2 class="btn-icon-inline" />
                <span>清理旧日志</span>
              </button>
              <button class="btn btn-ghost btn-sm icon-text-btn" @click="fetchLogs(1)">
                <RefreshCw class="btn-icon-inline" />
                <span>刷新</span>
              </button>
            </div>
          </div>

          <div v-if="logsLoading" class="loading-center"><div class="loading-spinner"></div></div>

          <template v-else>
            <div class="log-table-wrap card">
              <table class="log-table">
                <thead>
                  <tr>
                    <th style="width:80px">级别</th>
                    <th style="width:140px">时间</th>
                    <th style="width:80px">方法</th>
                    <th style="width:160px">路由</th>
                    <th>消息</th>
                    <th style="width:60px">状态码</th>
                    <th style="width:80px">用户</th>
                  </tr>
                </thead>
                <tbody>
                  <template v-for="log in logs" :key="log.id">
                    <tr
                      class="log-row"
                      :class="`log-row-${log.level}`"
                      @click="toggleLogDetail(log.id)"
                    >
                      <td><span class="level-badge" :class="`level-${log.level}`">{{ levelLabel(log.level) }}</span></td>
                      <td class="log-time">{{ formatDate(log.created_at) }}</td>
                      <td><span v-if="log.method" class="method-badge">{{ log.method }}</span></td>
                      <td class="log-route">{{ log.route || '-' }}</td>
                      <td class="log-message">{{ log.message }}</td>
                      <td>{{ log.status_code || '-' }}</td>
                      <td>{{ log.username ? '@' + log.username : '-' }}</td>
                    </tr>
                    <!-- 展开堆栈 -->
                    <tr v-if="expandedLog === log.id && log.error_stack" class="log-stack-row">
                      <td colspan="7">
                        <pre class="error-stack">{{ log.error_stack }}</pre>
                      </td>
                    </tr>
                  </template>
                  <tr v-if="logs.length === 0">
                    <td colspan="7" style="text-align:center;padding:24px;color:var(--color-text-secondary)">
                      暂无日志记录
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- 分页 -->
            <div class="pagination">
              <button class="btn btn-ghost btn-sm" :disabled="logPager.page <= 1" @click="fetchLogs(logPager.page - 1)">‹ 上一页</button>
              <span class="page-info">第 {{ logPager.page }} / {{ logPager.pages }} 页（共 {{ logPager.total }} 条）</span>
              <button class="btn btn-ghost btn-sm" :disabled="logPager.page >= logPager.pages" @click="fetchLogs(logPager.page + 1)">下一页 ›</button>
            </div>
          </template>
        </template>

        <!-- 用户 Tab -->
        <template v-else-if="activeTab === 'users'">
          <div class="section-title">
            <Users class="section-icon" />
            用户列表
          </div>
          <div v-if="usersLoading" class="loading-center"><div class="loading-spinner"></div></div>
          <template v-else>
            <div class="card" style="padding: 0; overflow: hidden">
              <table class="log-table">
                <thead>
                  <tr>
                    <th>用户</th>
                    <th>邮箱（脱敏）</th>
                    <th>主题</th>
                    <th>记事数</th>
                    <th>角色</th>
                    <th>注册时间</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="u in userList" :key="u.id">
                    <td>
                      <div style="display:flex;align-items:center;gap:8px">
                        <span class="user-avatar" :style="{ background: u.avatar_color }">
                          {{ (u.nickname || u.username).charAt(0).toUpperCase() }}
                        </span>
                        <div>
                          <div style="font-weight:600">{{ u.nickname }}</div>
                          <div style="font-size:12px;color:var(--color-text-secondary)">@{{ u.username }}</div>
                        </div>
                      </div>
                    </td>
                    <td>{{ maskEmail(u.email) }}</td>
                    <td>{{ u.theme }}</td>
                    <td>{{ u.note_count }}</td>
                    <td>
                      <span class="role-badge" :class="{ admin: u.is_admin }">
                        <Crown v-if="u.is_admin" class="role-icon" />
                        <User v-else class="role-icon" />
                        {{ u.is_admin ? '管理员' : '用户' }}
                      </span>
                    </td>
                    <td>{{ formatDate(u.created_at) }}</td>
                  </tr>
                  <tr v-if="userList.length === 0">
                    <td colspan="6" style="text-align:center;padding:24px;color:var(--color-text-secondary)">暂无用户</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div class="pagination">
              <button class="btn btn-ghost btn-sm" :disabled="userPager.page <= 1" @click="fetchUsers(userPager.page - 1)">‹ 上一页</button>
              <span class="page-info">共 {{ userPager.total }} 个用户</span>
              <button class="btn btn-ghost btn-sm" :disabled="userPager.page * userPager.limit >= userPager.total" @click="fetchUsers(userPager.page + 1)">下一页 ›</button>
            </div>
          </template>
        </template>

        <!-- 推送通知 Tab -->
        <template v-else-if="activeTab === 'push'">
          <div class="section-header">
            <div class="section-title" style="margin-bottom:0">
              <Bell class="section-icon" />
              通知推送
            </div>
            <button class="btn btn-ghost btn-sm icon-text-btn" @click="fetchPushNotifications">
              <RefreshCw class="btn-icon-inline" />
              <span>刷新</span>
            </button>
          </div>

          <div class="push-summary-row">
            <div class="card push-summary-card">
              <div class="push-summary-label">已开启推送用户</div>
              <div class="push-summary-value">{{ pushSummary.subscribed_users }}</div>
            </div>
            <div class="card push-summary-card">
              <div class="push-summary-label">待发送定时通知</div>
              <div class="push-summary-value">{{ pushSummary.scheduled_count }}</div>
            </div>
          </div>

          <div class="card push-form-card">
            <h3 class="trend-title">
              <Send class="section-icon-sm" />
              立即发送通知
            </h3>
            <div class="push-form-grid">
              <input v-model.trim="pushNowForm.title" type="text" class="input" maxlength="120" placeholder="通知标题（必填）" />
              <input v-model.trim="pushNowForm.url" type="text" class="input" placeholder="点击跳转路径（默认 /plans）" />
              <textarea
                v-model.trim="pushNowForm.body"
                class="input push-body-input"
                maxlength="1000"
                placeholder="通知内容（必填）"
              ></textarea>
              <button class="btn btn-primary icon-text-btn push-submit-btn" :disabled="pushSending" @click="sendPushNow">
                <Send class="btn-icon-inline" />
                <span>{{ pushSending ? '发送中...' : '立即发送' }}</span>
              </button>
            </div>
          </div>

          <div class="card push-form-card">
            <h3 class="trend-title">
              <Bell class="section-icon-sm" />
              新建定时通知
            </h3>
            <div class="push-form-grid">
              <input v-model.trim="pushScheduleForm.title" type="text" class="input" maxlength="120" placeholder="通知标题（必填）" />
              <input v-model.trim="pushScheduleForm.url" type="text" class="input" placeholder="点击跳转路径（默认 /plans）" />
              <textarea
                v-model.trim="pushScheduleForm.body"
                class="input push-body-input"
                maxlength="1000"
                placeholder="通知内容（必填）"
              ></textarea>
              <input v-model="pushScheduleForm.scheduled_for" type="datetime-local" class="input" />
              <button class="btn btn-outline icon-text-btn push-submit-btn" :disabled="pushCreating" @click="createPushNotification">
                <Bell class="btn-icon-inline" />
                <span>{{ pushCreating ? '创建中...' : '创建定时通知' }}</span>
              </button>
            </div>
          </div>

          <div class="card push-list-card">
            <div class="trend-title">
              <Bell class="section-icon-sm" />
              定时通知列表
            </div>

            <div v-if="pushLoading" class="loading-center"><div class="loading-spinner"></div></div>
            <template v-else>
              <div class="push-table-wrap">
                <table class="log-table">
                  <thead>
                    <tr>
                      <th style="width:300px">通知内容</th>
                      <th style="width:160px">计划发送</th>
                      <th style="width:110px">状态</th>
                      <th style="width:140px">发送结果</th>
                      <th style="width:140px">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="item in pushNotifications" :key="item.id">
                      <td>
                        <div class="push-item-title">{{ item.title }}</div>
                        <div class="push-item-body">{{ item.body }}</div>
                      </td>
                      <td class="log-time">{{ formatDate(item.scheduled_for) }}</td>
                      <td>
                        <span class="push-status-badge" :class="`push-status-${item.status}`">{{ pushStatusLabel(item.status) }}</span>
                      </td>
                      <td class="push-result-text">{{ pushResultText(item) }}</td>
                      <td>
                        <button
                          v-if="item.status === 'scheduled' || item.status === 'failed'"
                          class="btn btn-ghost btn-sm icon-text-btn"
                          :disabled="Boolean(pushActionLoading[item.id])"
                          @click="sendScheduledNow(item)"
                        >
                          <Play class="btn-icon-inline" />
                          <span>{{ pushActionLoading[item.id] ? '发送中...' : '立即发送' }}</span>
                        </button>
                        <span v-else class="push-action-placeholder">-</span>
                      </td>
                    </tr>
                    <tr v-if="pushNotifications.length === 0">
                      <td colspan="5" style="text-align:center;padding:24px;color:var(--color-text-secondary)">暂无定时通知</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div class="push-cards-mobile">
                <div v-for="item in pushNotifications" :key="`mobile-${item.id}`" class="push-mobile-card">
                  <div class="push-mobile-head">
                    <div class="push-item-title">{{ item.title }}</div>
                    <span class="push-status-badge" :class="`push-status-${item.status}`">{{ pushStatusLabel(item.status) }}</span>
                  </div>
                  <div class="push-item-body">{{ item.body }}</div>
                  <div class="push-mobile-meta">计划发送：{{ formatDate(item.scheduled_for) }}</div>
                  <div class="push-mobile-meta">结果：{{ pushResultText(item) }}</div>
                  <button
                    v-if="item.status === 'scheduled' || item.status === 'failed'"
                    class="btn btn-ghost btn-sm icon-text-btn"
                    :disabled="Boolean(pushActionLoading[item.id])"
                    @click="sendScheduledNow(item)"
                  >
                    <Play class="btn-icon-inline" />
                    <span>{{ pushActionLoading[item.id] ? '发送中...' : '立即发送' }}</span>
                  </button>
                </div>
                <div v-if="pushNotifications.length === 0" class="chart-empty">暂无定时通知</div>
              </div>
            </template>
          </div>
        </template>
      </main>
    </div>

    <!-- 清理日志弹窗 -->
    <Teleport to="body">
      <div v-if="showCleanModal" class="modal-overlay" @click.self="showCleanModal = false">
        <div class="modal-card card">
          <h3 class="modal-title">
            <Trash2 class="section-icon-sm" />
            清理旧日志
          </h3>
          <p style="font-size:14px;color:var(--color-text-secondary);margin-bottom:16px">
            清理多少天前的日志？（保留近 N 天）
          </p>
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:20px">
            <span>保留近</span>
            <input v-model="cleanDays" type="number" class="input" style="width:80px" min="1" max="365" />
            <span>天内的日志</span>
          </div>
          <div style="display:flex;gap:10px;justify-content:flex-end">
            <button class="btn btn-outline" @click="showCleanModal = false">取消</button>
            <button class="btn btn-danger" @click="cleanLogs">确认清理</button>
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
  Bell,
  ChartColumn,
  ChartLine,
  Crown,
  Flower2,
  LogOut,
  Logs,
  NotebookText,
  Play,
  RefreshCw,
  Send,
  User,
  UserPlus,
  UserRoundPlus,
  Users,
  CircleX,
  Trash2
} from 'lucide-vue-next'
import AppSelect from '@/components/AppSelect.vue'
import { useUserStore } from '@/stores/user'
import { adminApi } from '@/api'
import { toast } from '@/utils/toast'
import dayjs from 'dayjs'

const router = useRouter()
const userStore = useUserStore()

const activeTab = ref('overview')
const tabs = [
  { id: 'overview', icon: ChartColumn, label: '数据概览' },
  { id: 'logs', icon: Logs, label: '系统日志' },
  { id: 'users', icon: Users, label: '用户列表' },
  { id: 'push', icon: Bell, label: '通知推送' }
]
const logLevelOptions = [
  { value: 'all', label: '全部级别' },
  { value: 'error', label: '错误' },
  { value: 'warn', label: '警告' },
  { value: 'info', label: '信息' }
]

// ===== 概览 =====
const stats = ref(null)
const statsLoading = ref(false)

const statCards = computed(() => {
  if (!stats.value) return []
  const o = stats.value.overview
  return [
    { icon: Users, label: '总用户数', main: o.total_users, sub: `今日 +${o.today_users}`, color: '#FFB3C6' },
    { icon: NotebookText, label: '总记事数', main: o.total_notes, sub: `今日 +${o.today_notes}`, color: '#B5EAD7' },
    { icon: Logs, label: '总日志数', main: o.total_logs, sub: `今日 +${o.today_logs}`, color: '#C7CEEA' },
    { icon: CircleX, label: '错误日志', main: o.error_logs, sub: '累计错误数', color: '#FFD6D6' },
  ]
})

async function fetchStats() {
  statsLoading.value = true
  try {
    const res = await adminApi.getStats()
    if (res.success) stats.value = res.data
  } catch (err) {
    toast.error('获取统计数据失败: ' + err.message)
  } finally {
    statsLoading.value = false
  }
}

// 填充近7天（空日期补0）
function filledTrend(trend) {
  const result = []
  for (let i = 6; i >= 0; i--) {
    const date = dayjs().subtract(i, 'day').format('YYYY-MM-DD')
    const found = trend.find(t => dayjs(t.date).format('YYYY-MM-DD') === date)
    result.push({ date, count: found ? parseInt(found.count) : 0 })
  }
  return result
}

function barHeight(count, trend) {
  const max = Math.max(...filledTrend(trend).map(t => t.count), 1)
  return Math.max(4, (parseInt(count) / max) * 80)
}

function shortDate(date) {
  return dayjs(date).format('M/D')
}

function levelBarWidth(count) {
  if (!stats.value) return 0
  const total = stats.value.overview.total_logs
  if (!total) return 0
  return Math.round((parseInt(count) / total) * 100)
}

// ===== 日志 =====
const logs = ref([])
const logsLoading = ref(false)
const expandedLog = ref(null)
const logFilter = ref({ level: 'all', search: '' })
const logPager = ref({ page: 1, pages: 1, total: 0 })
const showCleanModal = ref(false)
const cleanDays = ref(30)

let debounceTimer = null
function debounceFetchLogs() {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => fetchLogs(1), 400)
}

async function fetchLogs(page = 1) {
  logsLoading.value = true
  try {
    const params = { page, limit: 50 }
    if (logFilter.value.level !== 'all') params.level = logFilter.value.level
    if (logFilter.value.search) params.search = logFilter.value.search

    const res = await adminApi.getLogs(params)
    if (res.success) {
      logs.value = res.data.logs
      logPager.value = { page: res.data.page, pages: res.data.pages, total: res.data.total, limit: res.data.limit }
    }
  } catch (err) {
    toast.error('获取日志失败: ' + err.message)
  } finally {
    logsLoading.value = false
  }
}

function toggleLogDetail(id) {
  expandedLog.value = expandedLog.value === id ? null : id
}

async function cleanLogs() {
  try {
    const res = await adminApi.cleanLogs(cleanDays.value)
    if (res.success) {
      toast.success(res.data.message)
      showCleanModal.value = false
      fetchLogs(1)
      fetchStats()
    }
  } catch (err) {
    toast.error(err.message)
  }
}

// ===== 用户 =====
const userList = ref([])
const usersLoading = ref(false)
const userPager = ref({ page: 1, total: 0, limit: 20 })

async function fetchUsers(page = 1) {
  usersLoading.value = true
  try {
    const res = await adminApi.getUsers({ page, limit: 20 })
    if (res.success) {
      userList.value = res.data.users
      userPager.value = { page: res.data.page, total: res.data.total, limit: res.data.limit }
    }
  } catch (err) {
    toast.error('获取用户失败: ' + err.message)
  } finally {
    usersLoading.value = false
  }
}

// ===== 推送通知 =====
const pushLoading = ref(false)
const pushSending = ref(false)
const pushCreating = ref(false)
const pushNotifications = ref([])
const pushSummary = ref({
  subscribed_users: 0,
  scheduled_count: 0
})
const pushActionLoading = ref({})
const pushNowForm = ref({
  title: '',
  body: '',
  url: '/plans'
})
const pushScheduleForm = ref({
  title: '',
  body: '',
  url: '/plans',
  scheduled_for: ''
})

function initDefaultScheduleTime() {
  pushScheduleForm.value.scheduled_for = dayjs().add(10, 'minute').format('YYYY-MM-DDTHH:mm')
}

async function fetchPushNotifications() {
  pushLoading.value = true
  try {
    const res = await adminApi.getPushNotifications()
    if (res.success) {
      pushSummary.value = res.data.summary
      pushNotifications.value = res.data.notifications
    }
  } catch (err) {
    toast.error('获取通知数据失败: ' + err.message)
  } finally {
    pushLoading.value = false
  }
}

async function sendPushNow() {
  if (!pushNowForm.value.title || !pushNowForm.value.body) {
    toast.error('请填写通知标题和内容')
    return
  }

  pushSending.value = true
  try {
    const res = await adminApi.sendPushNow(pushNowForm.value)
    toast.success(res.message || '通知发送完成')
    fetchPushNotifications()
  } catch (err) {
    toast.error(err.message || '通知发送失败')
  } finally {
    pushSending.value = false
  }
}

async function createPushNotification() {
  if (!pushScheduleForm.value.title || !pushScheduleForm.value.body) {
    toast.error('请填写通知标题和内容')
    return
  }
  if (!pushScheduleForm.value.scheduled_for) {
    toast.error('请选择定时发送时间')
    return
  }

  const scheduledDate = new Date(pushScheduleForm.value.scheduled_for)
  if (Number.isNaN(scheduledDate.getTime())) {
    toast.error('定时发送时间无效')
    return
  }

  pushCreating.value = true
  try {
    const payload = {
      title: pushScheduleForm.value.title,
      body: pushScheduleForm.value.body,
      url: pushScheduleForm.value.url,
      scheduled_for: scheduledDate.toISOString()
    }
    const res = await adminApi.createPushNotification(payload)
    toast.success(res.message || '定时通知已创建')
    pushScheduleForm.value.title = ''
    pushScheduleForm.value.body = ''
    pushScheduleForm.value.url = '/plans'
    initDefaultScheduleTime()
    fetchPushNotifications()
  } catch (err) {
    toast.error(err.message || '创建定时通知失败')
  } finally {
    pushCreating.value = false
  }
}

async function sendScheduledNow(item) {
  if (!item?.id) return

  pushActionLoading.value = {
    ...pushActionLoading.value,
    [item.id]: true
  }

  try {
    const res = await adminApi.sendPushNotificationNow(item.id)
    toast.success(res.message || '已触发发送')
    fetchPushNotifications()
  } catch (err) {
    toast.error(err.message || '触发发送失败')
  } finally {
    const next = { ...pushActionLoading.value }
    delete next[item.id]
    pushActionLoading.value = next
  }
}

function pushStatusLabel(status) {
  return {
    scheduled: '待发送',
    sending: '发送中',
    sent: '已发送',
    failed: '失败'
  }[status] || status
}

function pushResultText(item) {
  if (item.status === 'scheduled') return '等待定时触发'
  if (item.status === 'sending') return '发送中...'
  if (item.status === 'failed') {
    const total = Number(item.total_count || 0)
    const sent = Number(item.sent_count || 0)
    const detail = total > 0 ? `${sent}/${total}` : '0/0'
    return item.last_error ? `${detail} · ${item.last_error}` : detail
  }
  const total = Number(item.total_count || 0)
  const sent = Number(item.sent_count || 0)
  return `${sent}/${total}`
}

// ===== 工具函数 =====
function formatDate(date) {
  return dayjs(date).format('YYYY/MM/DD HH:mm')
}

function levelLabel(level) {
  return { error: '错误', warn: '警告', info: '信息' }[level] || level
}

function maskEmail(email) {
  if (!email) return '-'
  const [user, domain] = email.split('@')
  const masked = user.length <= 2 ? '**' : user[0] + '*'.repeat(user.length - 2) + user[user.length - 1]
  return `${masked}@${domain}`
}

function handleLogout() {
  userStore.logout()
  router.push('/login')
}

// 切换 tab 时懒加载数据
function onTabChange(tab) {
  if (tab === 'logs' && logs.value.length === 0) fetchLogs()
  if (tab === 'users' && userList.value.length === 0) fetchUsers()
  if (tab === 'push' && pushNotifications.value.length === 0) fetchPushNotifications()
}

watch(activeTab, onTabChange)

onMounted(() => {
  fetchStats()
  initDefaultScheduleTime()
})
</script>

<style scoped lang="scss" src="@/assets/styles/views/AdminView.scss"></style>



