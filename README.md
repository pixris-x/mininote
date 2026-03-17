# 🌸 Mini Note

> 可爱扁平化风格的多端个人管理应用，支持富文本记事、日历关联、记账统计与管理面板。

---

## 技术栈

| 层次 | 技术 |
|------|------|
| 前端 | Vue 3 + Vite 5 + Vue Router 4 + Pinia 2 |
| 后端 | Node.js + Express 5 |
| 数据库 | PostgreSQL |
| 富文本编辑器 | Tiptap 3 |
| 图表 | ECharts 6 |
| 图标 | Lucide Vue Next |
| 日期处理 | Day.js · lunar-javascript（农历） |
| 样式 | 原生 CSS（扁平化可爱风，多主题） |
| 包管理 | pnpm |

---

## 功能特性

- 🔐 **登录 / 注册 / 找回密码** — JWT 认证，邮件验证码重置密码
- 📝 **富文本记事** — Tiptap 编辑器，支持标题、列表、任务清单、图片、链接、颜色等；带搜索、置顶、颜色标记、标签管理、自动保存
- 🎯 **制定计划** — 创建多个计划项目，以步骤时间线管理进度，支持步骤状态、特殊标识、截止日期、图片上传
- 📅 **日历记事** — 将记事关联到日历日期，月视图浏览，显示农历节假日
- 💰 **记账本** — 收支记录、自定义分类（图标 + 颜色）、按年 / 月筛选
- 📊 **统计分析** — 月度支出趋势折线图、分类占比环形图、分类排行榜、每日明细表
- 🖼️ **图片上传** — 富文本内嵌图片，支持裁剪（Cropper.js）
- 🌸 **个人主页** — 多主题切换、头像自定义、修改密码
- 👑 **管理面板** — 用户管理、系统日志查看（仅管理员可见）
- 📱 **多端自适应** — 移动端底部导航 + 桌面端侧边栏

---

## 快速开始

### 环境要求

- Node.js ≥ 18
- PostgreSQL ≥ 14
- pnpm

### 1. 配置环境变量

编辑 `backend/.env`：

```env
PORT=3000
DB_HOST=127.0.0.1
DB_PORT=5432
DB_NAME=minilist_db
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d
CORS_ORIGINS=http://localhost:5173
RESEND_API_KEY=your_resend_api_key
EMAIL_FROM=Mini Note <hi@example.com>
FRONTEND_URL=http://localhost:5173
```

### 2. 初始化数据库

```bash
cd backend
pnpm install

pnpm db:init      # 创建基础表结构
pnpm db:migrate   # 执行所有增量迁移（幂等，可重复运行）
pnpm db:admin     # （可选）创建默认管理员账号
```

### 3. 启动后端

```bash
cd backend
pnpm dev
# 后端运行在 http://localhost:3000
```

### 4. 启动前端

```bash
cd frontend
pnpm install
pnpm dev
# 前端运行在 http://localhost:5173
```

---

## 数据库迁移系统

迁移文件统一存放于 `backend/config/migrations/`，按编号顺序自动执行，已执行过的文件记录在 `schema_migrations` 表中不再重复执行。

```
config/
├── init.sql                         # 基础表结构（首次初始化）
└── migrations/
    ├── 001_admin_and_logs.sql       # is_admin 字段 + system_logs 表
    ├── 002_expense.sql              # 记账分类 + 消费记录表
    └── 003_password_reset.sql       # 密码重置验证码表
```

新增迁移只需在 `migrations/` 目录下按编号新建 SQL 文件，运行 `pnpm db:migrate` 即可。

---

## 项目结构

```
MiniList/
├── backend/
│   ├── config/
│   │   ├── db.js                        # PostgreSQL 连接池配置
│   │   ├── init.sql                     # 基础表结构（用户、记事、日历、日志）
│   │   └── migrations/                  # 增量迁移 SQL 文件（按编号顺序）
│   │       ├── 001_admin_and_logs.sql
│   │       ├── 002_expense.sql
│   │       └── 003_password_reset.sql
│   ├── middleware/
│   │   ├── auth.js                      # JWT 认证中间件
│   │   └── admin.js                     # 管理员权限中间件
│   ├── routes/
│   │   ├── auth.js                      # 登录 / 注册 / 忘记密码
│   │   ├── user.js                      # 用户资料
│   │   ├── notes.js                     # 记事 CRUD
│   │   ├── calendar.js                  # 日历关联
│   │   ├── expenses.js                  # 记账 CRUD + 统计
│   │   ├── expense-categories.js        # 自定义消费分类
│   │   ├── upload.js                    # 图片上传
│   │   └── admin.js                     # 管理员接口
│   ├── scripts/
│   │   ├── init-db.js                   # 数据库初始化
│   │   ├── migrate.js                   # 统一迁移入口
│   │   └── create-admin.js             # 创建管理员账号
│   ├── utils/
│   │   ├── email.js                     # 邮件发送（Resend）
│   │   └── logger.js                    # 请求 / 错误日志
│   ├── uploads/                         # 上传图片存储目录
│   ├── app.js                           # Express 应用入口
│   └── .env                             # 环境变量
│
└── frontend/
    ├── src/
    │   ├── api/
    │   │   └── index.js                 # Axios 封装（含所有模块 API）
    │   ├── assets/styles/
    │   │   └── main.css                 # 全局 CSS 变量 + 多主题
    │   ├── components/
    │   │   ├── AppLayout.vue            # 布局（侧边栏 + 底部导航）
    │   │   ├── NoteCard.vue             # 记事卡片
    │   │   ├── TiptapEditor.vue         # 富文本编辑器封装
    │   │   └── ResizableImageView.vue   # 可缩放图片组件
    │   ├── router/
    │   │   └── index.js                 # 路由 + 认证守卫
    │   ├── stores/
    │   │   ├── user.js                  # 用户状态（Pinia）
    │   │   ├── notes.js                 # 记事状态
    │   │   └── expense.js               # 记账状态
    │   ├── utils/
    │   │   ├── toast.js                 # 全局 Toast 通知
    │   │   └── holidays.js              # 节假日数据
    │   └── views/
    │       ├── LoginView.vue            # 登录 / 注册
    │       ├── ForgotPasswordView.vue   # 找回密码
    │       ├── NotesView.vue            # 记事列表
    │       ├── NoteDetailView.vue       # 记事详情（富文本编辑）
    │       ├── CalendarView.vue         # 日历记事
    │       ├── ExpenseView.vue          # 记账 + 统计
    │       ├── ProfileView.vue          # 个人主页
    │       └── AdminView.vue            # 管理面板
    └── vite.config.js
```

---

## API 接口

### 认证 `/api/auth`

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/register` | 注册 |
| POST | `/login` | 登录 |
| POST | `/forgot-password` | 发送重置验证码 |
| POST | `/reset-password` | 验证码重置密码 |

### 用户 `/api/user`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/profile` | 获取个人资料 |
| PUT | `/profile` | 更新个人资料 |
| PUT | `/password` | 修改密码 |

### 记事 `/api/notes`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/` | 获取所有记事（支持搜索 / 标签筛选） |
| GET | `/:id` | 获取记事详情 |
| POST | `/` | 创建记事 |
| PUT | `/:id` | 更新记事 |
| DELETE | `/:id` | 删除记事 |

### 日历 `/api/calendar`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/month?year=&month=` | 月历概览 |
| GET | `/day?date=` | 某天关联记事 |
| POST | `/link` | 关联记事到日期 |
| DELETE | `/link` | 取消关联 |

### 计划 `/api/plans`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/` | 计划列表（含步骤进度，可按状态筛选） |
| GET | `/:id` | 计划详情（含所有步骤） |
| POST | `/` | 创建计划 |
| PUT | `/:id` | 更新计划 |
| DELETE | `/:id` | 删除计划（步骤级联删除） |

### 计划步骤 `/api/plan-steps`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/?plan_id=` | 获取计划的所有步骤 |
| POST | `/` | 新增步骤 |
| PUT | `/:id` | 更新步骤（标题、状态、标识、图片等） |
| PATCH | `/reorder` | 批量更新步骤排序 |
| DELETE | `/:id` | 删除步骤 |

### 记账 `/api/expenses`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/` | 记录列表（支持年 / 月 / 分类筛选） |
| GET | `/stats` | 月度统计（总支出、分类构成、每日趋势） |
| POST | `/` | 新增记录 |
| PUT | `/:id` | 更新记录 |
| DELETE | `/:id` | 删除记录 |

### 消费分类 `/api/expense-categories`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/` | 分类列表（系统默认 + 用户自定义） |
| POST | `/` | 新增自定义分类 |
| PUT | `/:id` | 更新分类 |
| DELETE | `/:id` | 删除自定义分类 |

### 图片上传 `/api/upload`

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/image` | 上传图片，返回访问 URL |

### 管理员 `/api/admin`（需管理员权限）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/stats` | 系统统计数据 |
| GET | `/users` | 用户列表 |
| PUT | `/users/:id` | 更新用户信息 |
| GET | `/logs` | 系统错误日志 |

---

## package.json 快捷脚本

### 后端 (`backend/`)

```bash
pnpm dev          # 开发模式（nodemon 热重载）
pnpm start        # 生产模式
pnpm db:init      # 初始化数据库基础表
pnpm db:migrate   # 执行增量迁移
pnpm db:admin     # 创建 / 重置管理员账号
```

### 前端 (`frontend/`)

```bash
pnpm dev          # 开发服务器
pnpm build        # 生产构建
pnpm preview      # 预览构建产物
```

---

## 许可证

MIT
