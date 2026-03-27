# Nuxt + Backend 端口与环境变量策略

> 适用任务：`NT-P0-T3`  
> 生效范围：本地开发、测试环境、生产部署

## 1. 端口规划

### 本地开发（推荐）

- Backend（Express API）：`http://localhost:3000`
- Frontend（Nuxt）：`http://localhost:5173`

说明：

- 保持后端端口不变，降低后端脚本和联调改动成本。
- Nuxt 使用 `5173`，避免与后端 `3000` 冲突。

## 2. 后端环境变量调整

`backend/.env` 推荐值：

```env
PORT=3000
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
FRONTEND_URL=http://localhost:5173
```

要点：

- `CORS_ORIGINS` 必须包含 Nuxt 地址。
- `FRONTEND_URL` 用于邮件链接和计划提醒跳转，迁移期间必须指向 Nuxt 前端。

## 3. Nuxt 环境变量策略

Nuxt 侧统一使用：

- `NUXT_PUBLIC_API_BASE=/api`（浏览器请求 API 前缀）
- `NUXT_PUBLIC_UPLOADS_BASE=/uploads`（上传资源前缀）

开发时通过 Nuxt dev proxy（或 Nitro routeRules/proxy）转发：

- `/api` -> `http://localhost:3000`
- `/uploads` -> `http://localhost:3000`

## 4. 生产环境策略

推荐由网关/Nginx 统一反向代理：

- `https://app.example.com` -> Nuxt
- `https://app.example.com/api/*` -> Express API
- `https://app.example.com/uploads/*` -> Express 静态资源

优势：

- 前端始终请求相对路径 `/api`，无需区分环境域名。
- 减少 CORS 复杂度。

## 5. 迁移期间约束

1. 不在业务代码里硬编码 `localhost:3000`。
2. 所有 API 调用统一走配置注入（Nuxt plugin/runtimeConfig）。
3. 切换环境只改 `.env` 与部署层代理，不改业务逻辑。

## 6. 验收点

- [ ] 前后端可同时启动且端口不冲突
- [ ] 登录、上传、分享链接、邮件跳转均指向 Nuxt 地址
- [ ] 浏览器网络面板中 API 请求均为相对路径（`/api/*`）
