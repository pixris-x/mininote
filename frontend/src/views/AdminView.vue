<template>
  <div class="admin-page">
    <!-- 顶部导航 -->
    <header class="admin-header">
      <div class="header-left">
        <span class="logo-icon">🌸</span>
        <span class="logo-text">Mini List</span>
        <span class="admin-badge">👑 管理面板</span>
      </div>
      <div class="header-right">
        <span class="admin-user">{{ userStore.user?.nickname }}</span>
        <button class="btn btn-ghost btn-sm" @click="$router.push('/notes')">返回应用</button>
        <button class="btn btn-ghost btn-sm" @click="handleLogout">退出 🚪</button>
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
            <span>{{ tab.icon }}</span>
            <span>{{ tab.label }}</span>
          </button>
        </nav>
      </aside>

      <!-- 主内容 -->
      <main class="admin-main">
        <!-- 概览 Tab -->
        <template v-if="activeTab === 'overview'">
          <div class="section-title">📊 数据概览</div>

          <div v-if="statsLoading" class="loading-center"><div class="loading-spinner"></div></div>

          <template v-else-if="stats">
            <!-- 统计卡片 -->
            <div class="stat-cards">
              <div v-for="card in statCards" :key="card.label" class="stat-card" :style="{ borderTopColor: card.color }">
                <div class="stat-icon">{{ card.icon }}</div>
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
                <div class="trend-title">📈 近7天记事新增</div>
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
                <div class="trend-title">👤 近7天新增用户</div>
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
              <div class="trend-title">🪵 日志级别分布</div>
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
              <div class="trend-title">🆕 最近注册用户</div>
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
            <div class="section-title" style="margin-bottom:0">🪵 系统日志</div>
            <div class="log-actions">
              <select v-model="logFilter.level" class="select-input" @change="fetchLogs(1)">
                <option value="all">全部级别</option>
                <option value="error">❌ 错误</option>
                <option value="warn">⚠️ 警告</option>
                <option value="info">ℹ️ 信息</option>
              </select>
              <input
                v-model="logFilter.search"
                type="text"
                class="input"
                style="width:200px"
                placeholder="搜索消息/路由..."
                @input="debounceFetchLogs"
              />
              <button class="btn btn-outline btn-sm" @click="showCleanModal = true">🗑️ 清理旧日志</button>
              <button class="btn btn-ghost btn-sm" @click="fetchLogs(1)">🔄 刷新</button>
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
          <div class="section-title">👥 用户列表</div>
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
                        {{ u.is_admin ? '👑 管理员' : '👤 用户' }}
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
      </main>
    </div>

    <!-- 清理日志弹窗 -->
    <Teleport to="body">
      <div v-if="showCleanModal" class="modal-overlay" @click.self="showCleanModal = false">
        <div class="modal-card card">
          <h3 style="margin-bottom:16px">🗑️ 清理旧日志</h3>
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
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { adminApi } from '@/api'
import { toast } from '@/utils/toast'
import dayjs from 'dayjs'

const router = useRouter()
const userStore = useUserStore()

const activeTab = ref('overview')
const tabs = [
  { id: 'overview', icon: '📊', label: '数据概览' },
  { id: 'logs', icon: '🪵', label: '系统日志' },
  { id: 'users', icon: '👥', label: '用户列表' }
]

// ===== 概览 =====
const stats = ref(null)
const statsLoading = ref(false)

const statCards = computed(() => {
  if (!stats.value) return []
  const o = stats.value.overview
  return [
    { icon: '👥', label: '总用户数', main: o.total_users, sub: `今日 +${o.today_users}`, color: '#FFB3C6' },
    { icon: '📝', label: '总记事数', main: o.total_notes, sub: `今日 +${o.today_notes}`, color: '#B5EAD7' },
    { icon: '🪵', label: '总日志数', main: o.total_logs, sub: `今日 +${o.today_logs}`, color: '#C7CEEA' },
    { icon: '❌', label: '错误日志', main: o.error_logs, sub: '累计错误数', color: '#FFD6D6' },
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
}

import { watch } from 'vue'
watch(activeTab, onTabChange)

onMounted(fetchStats)
</script>

<style scoped>
.admin-page {
  min-height: 100vh;
  background: var(--color-bg);
  display: flex;
  flex-direction: column;
}

/* 顶栏 */
.admin-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  height: 56px;
  background: var(--color-surface);
  box-shadow: var(--shadow-sm);
  position: sticky;
  top: 0;
  z-index: 100;
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.logo-icon { font-size: 22px; }

.logo-text {
  font-size: 18px;
  font-weight: 800;
  color: var(--theme-primary-dark);
}

.admin-badge {
  padding: 3px 10px;
  background: linear-gradient(135deg, #FFD700, #FFA500);
  color: white;
  border-radius: var(--radius-full);
  font-size: 12px;
  font-weight: 700;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.admin-user {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
}

/* 布局 */
.admin-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.admin-sidebar {
  width: 160px;
  background: var(--color-surface);
  border-right: 1px solid var(--color-border);
  padding: 16px 8px;
  flex-shrink: 0;
}

.side-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 10px 12px;
  border: none;
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition);
  margin-bottom: 4px;
  font-family: inherit;
  text-align: left;
}

.side-item:hover,
.side-item.active {
  background: var(--theme-primary-light);
  color: var(--theme-primary-dark);
  font-weight: 700;
}

.admin-main {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
}

.section-title {
  font-size: 20px;
  font-weight: 800;
  color: var(--color-text);
  margin-bottom: 20px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 10px;
}

.log-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

/* 统计卡片 */
.stat-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 14px;
  margin-bottom: 20px;
}

.stat-card {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  padding: 20px;
  box-shadow: var(--shadow-sm);
  border-top: 4px solid;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.stat-icon { font-size: 28px; }

.stat-main {
  font-size: 32px;
  font-weight: 800;
  color: var(--color-text);
  line-height: 1;
}

.stat-sub {
  font-size: 13px;
  color: var(--color-text-secondary);
}

.stat-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-secondary);
  margin-top: 4px;
}

/* 趋势图 */
.trend-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  margin-bottom: 16px;
}

@media (max-width: 700px) {
  .trend-row { grid-template-columns: 1fr; }
}

.trend-card {
  padding: 20px;
}

.trend-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--color-text);
  margin-bottom: 16px;
}

.bar-chart {
  display: flex;
  align-items: flex-end;
  gap: 6px;
  height: 100px;
}

.chart-empty {
  font-size: 13px;
  color: var(--color-text-secondary);
  align-self: center;
  margin: auto;
}

.bar-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.bar-wrap {
  flex: 1;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  width: 100%;
}

.bar {
  width: 100%;
  border-radius: 4px 4px 0 0;
  min-height: 4px;
  transition: height 0.3s ease;
}

.bar-label {
  font-size: 10px;
  color: var(--color-text-secondary);
}

.bar-val {
  font-size: 10px;
  font-weight: 700;
  color: var(--color-text);
}

/* 日志级别分布 */
.level-dist {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.level-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.level-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}
.level-dot.level-error { background: #FF7B8A; }
.level-dot.level-warn  { background: #FFB347; }
.level-dot.level-info  { background: #87CEEB; }

.level-name { font-size: 13px; font-weight: 600; width: 40px; }

.level-bar-wrap {
  flex: 1;
  height: 10px;
  background: var(--color-border);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.level-bar {
  height: 100%;
  border-radius: var(--radius-full);
  transition: width 0.4s ease;
}
.level-bar-error { background: #FF7B8A; }
.level-bar-warn  { background: #FFB347; }
.level-bar-info  { background: #87CEEB; }

.level-count {
  font-size: 13px;
  font-weight: 700;
  width: 40px;
  text-align: right;
  color: var(--color-text);
}

/* 表格 */
.mini-table,
.log-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.mini-table th,
.log-table th {
  padding: 12px 14px;
  text-align: left;
  font-weight: 700;
  color: var(--color-text-secondary);
  border-bottom: 2px solid var(--color-border);
  white-space: nowrap;
  background: var(--color-bg);
}

.mini-table td,
.log-table td {
  padding: 10px 14px;
  border-bottom: 1px solid var(--color-border);
  vertical-align: middle;
}

.mini-table tr:last-child td,
.log-table tr:last-child td {
  border-bottom: none;
}

.log-table-wrap {
  overflow-x: auto;
  margin-bottom: 12px;
  padding: 0;
}

.log-row {
  cursor: pointer;
  transition: background var(--transition);
}

.log-row:hover { background: var(--color-bg); }
.log-row-error { background: rgba(255, 123, 138, 0.04); }
.log-row-warn  { background: rgba(255, 179, 71, 0.04); }

.level-badge {
  padding: 2px 8px;
  border-radius: var(--radius-full);
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
}
.level-error { background: #FFE0E3; color: #C0392B; }
.level-warn  { background: #FFF3E0; color: #E67E22; }
.level-info  { background: #E8F4FD; color: #2980B9; }

.method-badge {
  padding: 2px 6px;
  background: var(--color-border);
  color: var(--color-text);
  border-radius: 4px;
  font-size: 11px;
  font-weight: 700;
  font-family: monospace;
}

.log-time {
  font-size: 12px;
  color: var(--color-text-secondary);
  white-space: nowrap;
}

.log-route {
  font-size: 12px;
  font-family: monospace;
  color: var(--color-text-secondary);
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.log-message {
  max-width: 280px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.log-stack-row td {
  background: #1a1a2e;
  padding: 0;
}

.error-stack {
  margin: 0;
  padding: 12px 16px;
  font-size: 12px;
  color: #e74c3c;
  font-family: 'Courier New', monospace;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 200px;
  overflow-y: auto;
  background: #1a1a2e;
}

/* 用户头像 */
.user-avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  font-size: 12px;
  font-weight: 700;
  color: white;
  flex-shrink: 0;
}

.role-badge {
  font-size: 12px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: var(--radius-full);
  background: var(--color-border);
  color: var(--color-text-secondary);
}

.role-badge.admin {
  background: linear-gradient(135deg, #FFD700, #FFA500);
  color: white;
}

/* 分页 */
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 12px 0;
}

.page-info {
  font-size: 13px;
  color: var(--color-text-secondary);
}

/* 输入 */
.select-input {
  padding: 8px 12px;
  border: 2px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: 13px;
  background: var(--color-surface);
  color: var(--color-text);
  cursor: pointer;
  font-family: inherit;
  outline: none;
  transition: border-color var(--transition);
}

.select-input:focus {
  border-color: var(--theme-primary);
}

.loading-center {
  display: flex;
  justify-content: center;
  padding: 48px;
}

/* 弹窗 */
.modal-card {
  width: 100%;
  max-width: 380px;
  padding: 24px;
  animation: popIn 0.2s ease;
}

@media (max-width: 600px) {
  .admin-sidebar { display: none; }
  .admin-main { padding: 16px; }
}
</style>
