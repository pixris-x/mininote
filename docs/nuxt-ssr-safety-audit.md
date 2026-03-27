# Nuxt SSR 安全访问审计

> 审计时间：2026-03-27 15:19 CST  
> 对象目录：`frontend-nuxt`

## 1. 扫描项

- 浏览器 API：`window`、`document`、`navigator`、`localStorage`
- 约束：仅允许出现在 `.client.ts` 文件，或带 `import.meta.client` 保护逻辑的函数中。

## 2. 扫描结果

- `utils/session.ts`：`localStorage` 仅在函数内部访问，且有 `import.meta.client` 保护。
- `plugins/api.client.ts`：`window.location` 仅用于 401 跳转，文件为 `.client.ts`，仅客户端执行。
- 其余页面/布局/仓储未发现未保护的浏览器 API 顶层访问。

## 3. 结论

- 当前 `frontend-nuxt` 代码满足 SSR 安全访问基线。
- 后续新增代码必须沿用：
  1. 浏览器 API 优先放入 `utils/session.ts` 或 `*.client.ts`。
  2. 若在普通文件中使用，必须显式加 `import.meta.client` 保护。

