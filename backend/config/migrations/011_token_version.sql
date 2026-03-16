-- 给 users 表加 token_version 字段，用于单设备登录控制
ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 1;
