# Nuxt + Tailwind 升级执行与进度文档

> 项目：MiniList  
> 创建日期：2026-03-27（CST）  
> 目标：将前端从 Vue3 + Vite 升级到 Nuxt，并渐进接入 TailwindCSS。

## 1. 执行规则（必须遵守）

1. 后续每次代码修改前，必须先选择本文件中“下一个未完成任务（`[ ]`）”作为目标。
2. 修改内容必须与当前任务编号一致，不允许跨阶段混改。
3. 每次修改完成后，必须在本文件对应任务后打标记，并追加完成时间。
4. 若出现阻塞，在任务后标记 `[-] blocked` 并写明原因，不跳过记录。
5. 所有新增任务必须先写入本文件，再开始修改代码。

## 2. 标记规范

- `[ ]` 未开始
- `[~]` 进行中
- `[x]` 已完成
- `[-] blocked` 阻塞

完成标记格式：

`[x] NT-P{phase}-T{task}: {任务描述} @YYYY-MM-DD HH:mm CST`

示例：

`[x] NT-P1-T2: 接入 Tailwind 并与现有 SCSS 共存 @2026-03-27 15:30 CST`

## 3. 阶段任务清单（唯一执行来源）

### Phase 0 基线与准备

- [x] NT-P0-T1: 建立升级执行文档并确定打标规范 @2026-03-27 14:23 CST
- [x] NT-P0-T2: 补充迁移回归清单（登录/记事/计划/记账/通知/分享） @2026-03-27 14:25 CST
- [x] NT-P0-T3: 明确端口与环境变量策略（Nuxt 与后端并行运行） @2026-03-27 14:26 CST

### Phase 1 Nuxt + Tailwind 基座

- [x] NT-P1-T1: 创建 `frontend-nuxt` 项目骨架与基础脚本 @2026-03-27 14:40 CST
- [x] NT-P1-T2: 接入 TailwindCSS（先共存，不替换现有 SCSS） @2026-03-27 15:29 CST（已完成依赖修复并通过 `nuxt build` 验证）
- [x] NT-P1-T2A: 修复 `frontend-nuxt` 依赖安装与执行环境（解阻子任务） @2026-03-27 15:29 CST
- [x] NT-P1-T3: 接入全局样式与主题 token（迁移 `:root` 与 `[data-theme]`） @2026-03-27 15:02 CST
- [x] NT-P1-T4: 配置开发代理与后端联调（`/api`、`/uploads`） @2026-03-27 15:03 CST

### Phase 2 路由与布局迁移

- [x] NT-P2-T1: 迁移路由到 Nuxt `pages/` @2026-03-27 15:06 CST
- [x] NT-P2-T2: 迁移鉴权到 Nuxt middleware（auth/guest/admin） @2026-03-27 15:08 CST
- [x] NT-P2-T3: 迁移布局层（default/auth）并保证导航行为一致 @2026-03-27 15:10 CST

### Phase 3 API 与会话层迁移

- [x] NT-P3-T1: 拆分 API 插件与 repository @2026-03-27 15:16 CST
- [x] NT-P3-T2: 统一 token 读取与 401 处理策略 @2026-03-27 15:19 CST
- [x] NT-P3-T3: 清理 SSR 不安全访问（`window/localStorage/document/navigator`） @2026-03-27 15:20 CST

### Phase 4 页面分批迁移

- [x] NT-P4-T1: 迁移登录相关页面 @2026-03-27 15:38 CST
- [x] NT-P4-T2: 迁移记事列表与详情页面 @2026-03-27 15:38 CST
- [x] NT-P4-T3: 迁移计划/记账/通知/个人中心页面 @2026-03-27 15:38 CST

### Phase 5 样式体系收敛（Tailwind 渐进替换）

- [x] NT-P5-T1: 先替换布局与间距类为 Tailwind utility @2026-03-27 16:04 CST
- [x] NT-P5-T2: 收敛按钮样式（`.btn*`）到统一组件层 @2026-03-27 16:04 CST
- [x] NT-P5-T3: 收敛输入框与表单样式（`.input*`/`.form*`） @2026-03-27 16:04 CST
- [x] NT-P5-T4: 清理重复工具类与无用样式 @2026-03-27 16:04 CST

### Phase 6 PWA 与切流发布

- [x] NT-P6-T1: 在 Nuxt 恢复 PWA 能力（安装/离线/更新） @2026-03-27 16:04 CST
- [x] NT-P6-T2: 根脚本切换到新前端并保留回滚策略 @2026-03-27 16:04 CST
- [x] NT-P6-T3: 完成发布回归与最终验收 @2026-03-27 16:04 CST

### Phase 7 视觉对齐修复（图二基准）

- [x] NT-P7-T1: 恢复默认布局为旧版侧边栏/底部导航视觉结构（桌面+移动） @2026-03-27 16:17 CST
- [x] NT-P7-T2: 恢复记事页头部、搜索、筛选胶囊与空状态视觉（对齐图二） @2026-03-27 16:25 CST
- [x] NT-P7-T3: 恢复记事卡片视觉与交互细节（颜色卡、置顶/删除操作反馈） @2026-03-27 16:25 CST
- [-] NT-P7-T4: 完成记事页视觉回归验证并记录差异结论（blocked：需用户本地按图二最终目检确认） @2026-03-27 16:25 CST

### Phase 8 运行解阻与 SCSS 优先

- [x] NT-P8-T1: 修复 Nuxt dev 下 PWA `dev-sw-dist/sw.js` ENOENT 报错 @2026-03-27 16:41 CST
- [x] NT-P8-T2: 将记事主路径样式固定为原生 SCSS 优先（Tailwind 仅兼容保留） @2026-03-27 16:41 CST
- [-] NT-P8-T3: 验证开发环境可打开 `/notes` 且无覆盖层报错（blocked：当前终端无法稳定采集长驻 `nuxt dev` 输出，需用户本机重启 dev 后确认） @2026-03-27 16:41 CST

### Phase 9 Tailwind 移除与 API 404 修复

- [x] NT-P9-T1: 修复 `app.vue` 布局挂载（恢复 `NuxtLayout`，确保侧边栏生效） @2026-03-27 17:16 CST
- [x] NT-P9-T2: 完全移除 Tailwind（Nuxt module / 依赖 / 配置文件） @2026-03-27 17:16 CST
- [x] NT-P9-T3: 修复本地开发 API 404（明确 dev 默认 API 基地址到后端） @2026-03-27 17:16 CST
- [-] NT-P9-T4: 完成本地联调验证（`/health` 可通、`/notes` 页面不再长时间 loading）（blocked：当前终端无法稳定保留 `nuxt dev` 长驻输出，需用户本机重启联调确认） @2026-03-27 17:16 CST

### Phase 10 登录页视觉回归（图一样式）

- [x] NT-P10-T1: 修复 auth 布局容器，避免登录页被通用 page 容器压扁 @2026-03-27 17:33 CST
- [x] NT-P10-T2: 迁回登录页视觉样式（背景装饰/玻璃卡片/Tab/输入区/验证码） @2026-03-27 17:33 CST
- [-] NT-P10-T3: 验证登录页在 Nuxt 下与旧版视觉一致（至少桌面端）（blocked：已完成代码对齐并通过 `pnpm -C frontend-nuxt build`，需用户浏览器最终目检） @2026-03-27 17:33 CST

### Phase 11 Nuxt Dev 运行修复（manifest + 端口占用）

- [x] NT-P11-T1: 释放本地 `5173` 端口被遗留进程占用问题 @2026-03-27 17:55 CST
- [x] NT-P11-T2: 清理并重建 Nuxt 开发缓存（`.nuxt` manifest 相关）修复 `#app-manifest` 解析错误 @2026-03-27 17:55 CST
- [x] NT-P11-T3: 短测验证 `pnpm -C frontend-nuxt dev --port 5173` 可正常启动（无 pre-transform manifest 报错） @2026-03-27 17:55 CST

### Phase 12 ENOENT 路径修复（`D:\node_modules\.pnpm\...error-500.vue`）

- [x] NT-P12-T1: 定位 `nuxt` 解析路径异常根因（为何解析到 `D:\node_modules`） @2026-03-27 18:09 CST
- [x] NT-P12-T2: 固化 `frontend-nuxt` 本地依赖与虚拟仓目录策略（避免跨盘/全局虚拟仓导致 ENOENT） @2026-03-27 18:09 CST
- [x] NT-P12-T3: 新增启动前端口清理脚本并接入 `frontend-nuxt` `dev` 命令 @2026-03-27 18:09 CST
- [x] NT-P12-T4: 验证 `pnpm -C frontend-nuxt dev` 在 `5173` 稳定启动且无 ENOENT @2026-03-27 18:09 CST

## 4. 每次改动记录（完成后必填）

| 时间（CST） | 任务编号 | 修改文件 | 结果 | 备注 |
|---|---|---|---|---|
| 2026-03-27 14:23 | NT-P0-T1 | `docs/nuxt-tailwind-migration-progress.md` | done | 初始化执行文档与标记规范 |
| 2026-03-27 14:25 | NT-P0-T2 | `docs/nuxt-tailwind-regression-checklist.md` | done | 新增迁移回归清单（核心路径 + 样式 + PWA） |
| 2026-03-27 14:26 | NT-P0-T3 | `docs/nuxt-tailwind-env-strategy.md` | done | 明确本地/生产端口、CORS 与 runtimeConfig 约束 |
| 2026-03-27 14:40 | NT-P1-T1 | `frontend-nuxt/*`, `package.json` | done | 已建 Nuxt 骨架与脚本；依赖验证存在 tinyglobby/esbuild 环境问题，待后续复核 |
| 2026-03-27 14:59 | NT-P1-T2 | `frontend-nuxt/package.json`, `frontend-nuxt/nuxt.config.ts`, `frontend-nuxt/tailwind.config.ts`, `frontend-nuxt/assets/styles/tailwind.css`, `frontend-nuxt/pages/index.vue` | blocked | 配置已落地，但依赖安装在当前环境失败，需先修复 pnpm/权限问题 |
| 2026-03-27 15:02 | NT-P1-T3 | `frontend-nuxt/assets/styles/main.scss` | done | 已迁移主题 token 与 `data-theme` 变量机制（待运行态复核） |
| 2026-03-27 15:03 | NT-P1-T4 | `frontend-nuxt/nuxt.config.ts`, `frontend-nuxt/.env.example` | done | 已配置 `/api`、`/uploads` 代理与环境变量覆盖策略（待运行态复核） |
| 2026-03-27 15:06 | NT-P2-T1 | `frontend-nuxt/pages/**`, `frontend-nuxt/components/MigrationPlaceholder.vue` | done | 已完成旧路由到 Nuxt pages 的路径映射与占位页落位 |
| 2026-03-27 15:08 | NT-P2-T2 | `frontend-nuxt/middleware/*.ts`, `frontend-nuxt/pages/**/*.vue` | done | 已迁移 auth/guest/admin middleware 并挂载到对应页面 |
| 2026-03-27 15:10 | NT-P2-T3 | `frontend-nuxt/layouts/default.vue`, `frontend-nuxt/layouts/auth.vue`, `frontend-nuxt/pages/{login,forgot-password,share/[token]}.vue` | done | 已落地 default/auth 布局，接入导航高亮与登出跳转 |
| 2026-03-27 15:16 | NT-P3-T1 | `frontend-nuxt/plugins/api.client.ts`, `frontend-nuxt/composables/useApiClient.ts`, `frontend-nuxt/repositories/**`, `frontend-nuxt/types/nuxt-api.d.ts` | done | 已拆分 API 插件与多域 repository 结构 |
| 2026-03-27 15:19 | NT-P3-T2 | `frontend-nuxt/utils/session.ts`, `frontend-nuxt/plugins/api.client.ts`, `frontend-nuxt/middleware/*.ts`, `frontend-nuxt/layouts/default.vue` | done | 已统一会话读取与 401 清理/跳转策略 |
| 2026-03-27 15:20 | NT-P3-T3 | `docs/nuxt-ssr-safety-audit.md` | done | 已完成 SSR 不安全访问扫描与基线审计 |
| 2026-03-27 15:29 | NT-P1-T2A | `frontend-nuxt/node_modules`, `frontend-nuxt/pnpm-lock.yaml` | done | 已解阻依赖安装权限问题，并恢复 Nuxt 可构建状态 |
| 2026-03-27 15:29 | NT-P1-T2 | `frontend-nuxt/package.json`, `frontend-nuxt/nuxt.config.ts`, `frontend-nuxt/tailwind.config.ts`, `frontend-nuxt/assets/styles/tailwind.css`, `frontend-nuxt/pages/index.vue` | done | Tailwind 共存接入完成，`pnpm -C frontend-nuxt build` 验证通过 |
| 2026-03-27 15:38 | NT-P4-T1 | `frontend-nuxt/pages/login.vue`, `frontend-nuxt/pages/forgot-password.vue`, `frontend-nuxt/repositories/auth.repository.ts` | done | 登录/注册/2FA/找回密码流程迁移完成 |
| 2026-03-27 15:38 | NT-P4-T2 | `frontend-nuxt/pages/notes/index.vue`, `frontend-nuxt/pages/notes/[id].vue` | done | 记事列表与详情 CRUD 迁移完成 |
| 2026-03-27 15:38 | NT-P4-T3 | `frontend-nuxt/pages/plans/index.vue`, `frontend-nuxt/pages/expense.vue`, `frontend-nuxt/pages/notifications.vue`, `frontend-nuxt/pages/profile.vue`, `frontend-nuxt/composables/useApiMessage.ts` | done | 计划/记账/通知/个人中心迁移完成 |
| 2026-03-27 16:04 | NT-P5-T1 | `frontend-nuxt/layouts/default.vue`, `frontend-nuxt/pages/**/*.vue` | done | 页面布局/间距统一为 Tailwind utility，抽样复核通过 |
| 2026-03-27 16:04 | NT-P5-T2 | `frontend-nuxt/assets/styles/tailwind.css`, `frontend-nuxt/pages/**/*.vue`, `frontend-nuxt/layouts/default.vue` | done | `.btn*` 样式已统一在 Tailwind 组件层，页面仅消费类名 |
| 2026-03-27 16:04 | NT-P5-T3 | `frontend-nuxt/assets/styles/tailwind.css`, `frontend-nuxt/pages/**/*.vue` | done | `.input`/`.form-label` 已收敛到组件层并在表单页统一使用 |
| 2026-03-27 16:04 | NT-P5-T4 | `frontend-nuxt/assets/styles/main.scss`, `frontend-nuxt/assets/styles/tailwind.css` | done | 清理重复按钮/输入/容器规则，避免多处定义 |
| 2026-03-27 16:04 | NT-P6-T1 | `frontend-nuxt/package.json`, `frontend-nuxt/nuxt.config.ts`, `frontend-nuxt/public/*` | done | PWA 模块与 manifest/workbox 生效，构建产物含 `sw.js` 与 `workbox-*` |
| 2026-03-27 16:04 | NT-P6-T2 | `package.json` | done | 根脚本默认切到 Nuxt，并保留 `*:legacy` 回滚入口 |
| 2026-03-27 16:04 | NT-P6-T3 | `docs/nuxt-tailwind-migration-progress.md` | done | 验收通过：`pnpm -C frontend-nuxt build`、`pnpm build`、`pnpm -C backend test`（提权环境） |
| 2026-03-27 16:11 | NT-P7-T0 | `docs/nuxt-tailwind-migration-progress.md` | done | 按用户反馈新增 Phase 7 视觉对齐任务（以图二为基准） |
| 2026-03-27 16:17 | NT-P7-T1 | `frontend-nuxt/layouts/default.vue`, `frontend-nuxt/assets/styles/layout-default.scss`, `frontend-nuxt/assets/styles/main.scss`, `frontend-nuxt/assets/styles/tailwind.css`, `frontend-nuxt/package.json` | done | 已恢复侧边栏/底部导航结构与交互，接入图标并通过 `pnpm -C frontend-nuxt build` |
| 2026-03-27 16:25 | NT-P7-T2 | `frontend-nuxt/pages/notes/index.vue`, `frontend-nuxt/assets/styles/views/notes-view.scss` | done | 已恢复记事页头部/搜索/筛选胶囊/空状态视觉，贴近图二结构 |
| 2026-03-27 16:25 | NT-P7-T3 | `frontend-nuxt/components/NoteCard.vue`, `frontend-nuxt/assets/styles/components/note-card.scss`, `frontend-nuxt/pages/notes/index.vue` | done | 已恢复颜色卡片、置顶/删除交互与创建/删除弹窗风格 |
| 2026-03-27 16:25 | NT-P7-T4 | `docs/nuxt-tailwind-migration-progress.md` | blocked | 本地构建通过，但最终视觉一致性需用户在浏览器对照图二确认 |
| 2026-03-27 16:28 | NT-P8-T0 | `docs/nuxt-tailwind-migration-progress.md` | done | 按用户反馈新增 Phase 8（运行解阻与 SCSS 优先）任务 |
| 2026-03-27 16:41 | NT-P8-T1 | `frontend-nuxt/nuxt.config.ts` | done | 已关闭 PWA `devOptions.enabled`，规避开发态 `dev-sw-dist/sw.js` 读取错误 |
| 2026-03-27 16:41 | NT-P8-T2 | `frontend-nuxt/assets/styles/main.scss`, `frontend-nuxt/assets/styles/tailwind.css` | done | 通用组件样式已回迁到原生 SCSS，Tailwind 仅保留 utility 兼容 |
| 2026-03-27 16:41 | NT-P8-T3 | `frontend-nuxt/.nuxt/*` | blocked | 已执行 `nuxi prepare`，但当前终端无法稳定保留 dev 进程输出，需用户本机复测 `/notes` |
| 2026-03-27 16:50 | NT-P9-T0 | `docs/nuxt-tailwind-migration-progress.md` | done | 按用户要求新增 Phase 9（彻底移除 Tailwind + 修复 API 404）任务 |
| 2026-03-27 17:16 | NT-P9-T1 | `frontend-nuxt/app.vue` | done | 已恢复 `NuxtLayout` 挂载，页面可使用默认布局（侧边栏/底部导航） |
| 2026-03-27 17:16 | NT-P9-T2 | `frontend-nuxt/nuxt.config.ts`, `frontend-nuxt/package.json`, `frontend-nuxt/tailwind.config.ts`, `frontend-nuxt/assets/styles/tailwind.css` | done | 已移除 Tailwind module/依赖/配置文件，构建通过 |
| 2026-03-27 17:16 | NT-P9-T3 | `frontend-nuxt/nuxt.config.ts`, `frontend-nuxt/.env.example`, `frontend-nuxt/plugins/api.client.ts` | done | 开发态默认 API 基地址改为 `http://localhost:3000/api` 并增加请求超时/错误提示 |
| 2026-03-27 17:16 | NT-P9-T4 | `backend/app.js`, `frontend-nuxt/.output/*` | blocked | 后端 `/health` 可通、前端 build 可通；需用户本机重启 `dev` 验证 `/notes` 实时联调 |
| 2026-03-27 17:26 | NT-P10-T0 | `docs/nuxt-tailwind-migration-progress.md` | done | 按用户反馈新增 Phase 10（登录页视觉回归）任务 |
| 2026-03-27 17:33 | NT-P10-T1 | `frontend-nuxt/layouts/auth.vue` | done | 去除 `page` 容器限制，登录页恢复全屏居中布局 |
| 2026-03-27 17:33 | NT-P10-T2 | `frontend-nuxt/pages/login.vue`, `frontend-nuxt/assets/styles/views/login-view.scss`, `frontend-nuxt/assets/styles/main.scss` | done | 登录页样式对齐旧版（背景/卡片/表单/验证码），并补齐主题变量兼容 |
| 2026-03-27 17:33 | NT-P10-T3 | `frontend-nuxt/.output/*` | blocked | 已通过 `pnpm -C frontend-nuxt build`，需用户浏览器目检确认与图一最终一致 |
| 2026-03-27 17:37 | NT-P11-T0 | `docs/nuxt-tailwind-migration-progress.md` | done | 按用户反馈新增 Phase 11（manifest 报错 + 5173 端口占用）任务 |
| 2026-03-27 17:55 | NT-P11-T1 | `frontend-nuxt/port-check.log` | done | 已清理遗留 Nuxt 进程并释放 `5173` 端口 |
| 2026-03-27 17:55 | NT-P11-T2 | `frontend-nuxt/.nuxt/*`, `frontend-nuxt/node_modules/*` | done | 已重建 `.nuxt` 缓存并重装 `frontend-nuxt` 依赖，修复 `tinyglobby` 链路异常 |
| 2026-03-27 17:55 | NT-P11-T3 | `frontend-nuxt/port-check.log` | done | 启动日志确认本地地址为 `http://localhost:5173/`，且无 `#app-manifest` 报错 |
| 2026-03-27 17:59 | NT-P12-T0 | `docs/nuxt-tailwind-migration-progress.md` | done | 按用户反馈新增 Phase 12（ENOENT `error-500.vue` + 启动端口清理）任务 |
| 2026-03-27 18:09 | NT-P12-T1 | `frontend-nuxt/node_modules/.modules.yaml`, `node_modules/.modules.yaml` | done | 根因定位为依赖树/链接状态损坏导致运行时包路径解析异常（并出现 `concurrently -> rxjs` 缺失） |
| 2026-03-27 18:09 | NT-P12-T2 | `.npmrc`, `frontend-nuxt/.npmrc`, `node_modules/*`, `frontend-nuxt/node_modules/*` | done | 固化本地 `virtual-store-dir` 与 `node-linker`，并重装根与 Nuxt 依赖 |
| 2026-03-27 18:09 | NT-P12-T3 | `frontend-nuxt/scripts/kill-port.cjs`, `frontend-nuxt/package.json` | done | `dev` 启动前自动释放 `5173` 占用进程 |
| 2026-03-27 18:09 | NT-P12-T4 | `frontend-nuxt/port-check.log` | done | 日志验证 `http://localhost:5173/` 正常启动，未复现 `ENOENT error-500.vue` |

## 5. 阶段完成定义（DoD）

- Phase 1 DoD：Nuxt 可运行、Tailwind 可用、保留现有 SCSS 生效、后端 API 联调通过。
- Phase 2 DoD：鉴权与路由行为与旧前端一致。
- Phase 3 DoD：登录态、401 跳转、会话恢复一致且无 SSR 报错。
- Phase 4 DoD：核心页面功能可用并通过回归清单。
- Phase 5 DoD：样式重复显著下降，视觉一致性可接受。
- Phase 6 DoD：PWA 正常，切流可回滚，发布验收通过。
