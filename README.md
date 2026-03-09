# 🌸 MiniList

> 可爱扁平化风格的多端个人管理应用，支持记事、日历、记账与统计。

## 技术栈

| 层次 | 技术 |
|------|------|
| 前端 | Vue 3 + Vite 5 + Vue Router 4 + Pinia 2 |
| 后端 | Node.js + Express 4 |
| 数据库 | PostgreSQL |
| 样式 | 原生 CSS（扁平化可爱风，多主题） |
| 包管理 | pnpm |
| 图表 | ECharts 6（按需引入） |

## 功能特性

- 🔐 **登录 / 注册** — JWT 认证，安全可靠
- 📝 **记事主页** — 创建、搜索、置顶、颜色标记、标签管理、自动保存
- 📅 **日历记事** — 将记事关联到日历日期，月视图浏览
- 💰 **记账本** — 收支记录、自定义分类（图标+颜色）、按月筛选
- 📊 **统计分析** — 支出趋势折线图、分类占比环形图、分类排行榜、每日明细表
- 🌸 **个人主页** — 多主题切换、头像自定义、修改密码
- 👑 **管理面板** — 用户管理、系统日志查看（仅管理员）
- 📱 **多端适配** — 移动端底部导航 + 桌面端侧边栏

## 快速开始

### 1. 初始化数据库

```bash
cd backend
pnpm install
node scripts/init-db.js
node scripts/expense-migrate.js  # 记账模块表结构
```

### 2. 启动后端

```bash
cd backend
pnpm dev
# 后端运行在 http://localhost:3000
```

### 3. 启动前端

```bash
cd frontend
pnpm install
pnpm dev
# 前端运行在 http://localhost:5173
```

## 项目结构

```
MiniList/
├── backend/
│   ├── config/
│   │   ├── db.js                  # PostgreSQL 连接配置
│   │   ├── init.sql               # 基础表结构（用户、记事、日历、日志）
│   │   └── expense-migrate.sql    # 记账模块表结构
│   ├── middleware/
│   │   ├── auth.js                # JWT 认证中间件
│   │   └── logger.js              # 请求/错误日志中间件
│   ├── routes/
│   │   ├── auth.js                # 登录/注册
│   │   ├── user.js                # 用户信息
│   │   ├── notes.js               # 记事 CRUD
│   │   ├── calendar.js            # 日历关联
│   │   ├── expenses.js            # 记账 CRUD + 统计
│   │   ├── expense-categories.js  # 消费分类管理
│   │   └── admin.js               # 管理员接口
│   ├── scripts/
│   │   ├── init-db.js             # 数据库初始化
│   │   └── expense-migrate.js     # 记账模块迁移
│   ├── app.js                     # Express 入口
│   └── .env                       # 环境变量
│
└── frontend/
    ├── src/
    │   ├── api/
    │   │   └── index.js           # Axios 封装（含所有模块 API）
    │   ├── assets/styles/
    │   │   └── main.css           # 全局 CSS 变量 + 多主题
    │   ├── components/
    │   │   ├── AppLayout.vue      # 布局（侧边栏 + 底部导航）
    │   │   └── NoteCard.vue       # 记事卡片
    │   ├── router/
    │   │   └── index.js           # 路由 + 认证守卫
    │   ├── stores/
    │   │   ├── user.js            # 用户状态
    │   │   ├── notes.js           # 记事状态
    │   │   └── expense.js         # 记账状态
    │   ├── utils/
    │   │   └── toast.js           # 全局 Toast 通知
    │   └── views/
    │       ├── LoginView.vue
    │       ├── NotesView.vue
    │       ├── NoteDetailView.vue
    │       ├── CalendarView.vue
    │       ├── ExpenseView.vue    # 记账 + 统计
    │       ├── ProfileView.vue
    │       └── AdminView.vue
    └── vite.config.js
```

## API 接口

### 认证
- `POST /api/auth/register` — 注册
- `POST /api/auth/login` — 登录

### 用户
- `GET /api/user/profile` — 获取资料
- `PUT /api/user/profile` — 更新资料
- `PUT /api/user/password` — 修改密码

### 记事
- `GET /api/notes` — 获取所有记事（支持搜索/标签筛选）
- `GET /api/notes/:id` — 获取记事详情
- `POST /api/notes` — 创建记事
- `PUT /api/notes/:id` — 更新记事
- `DELETE /api/notes/:id` — 删除记事

### 日历
- `GET /api/calendar/month?year=&month=` — 获取月历概览
- `GET /api/calendar/day?date=` — 获取某天记事
- `POST /api/calendar/link` — 关联记事到日期
- `DELETE /api/calendar/link` — 取消关联

### 记账
- `GET /api/expenses` — 获取记录列表（支持年/月/分类筛选）
- `GET /api/expenses/stats` — 获取月度统计（总支出、今日、笔数、分类构成、每日趋势）
- `POST /api/expenses` — 新增记录
- `PUT /api/expenses/:id` — 更新记录
- `DELETE /api/expenses/:id` — 删除记录

### 消费分类
- `GET /api/expense-categories` — 获取分类列表（系统默认 + 用户自定义）
- `POST /api/expense-categories` — 新增自定义分类
- `PUT /api/expense-categories/:id` — 更新分类
- `DELETE /api/expense-categories/:id` — 删除自定义分类

### 管理员
- `GET /api/admin/stats` — 系统统计数据
- `GET /api/admin/users` — 用户列表
- `GET /api/admin/logs` — 系统日志
