-- 021_account_security.sql
-- 账户安全：二步验证 + 设备会话管理

-- 1) 用户二步验证开关
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN NOT NULL DEFAULT FALSE;

-- 2) 登录设备会话表
CREATE TABLE IF NOT EXISTS user_sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id VARCHAR(128) UNIQUE NOT NULL,
  device_name VARCHAR(120),
  user_agent TEXT,
  ip_address VARCHAR(80),
  last_active_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMP NULL
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_active
  ON user_sessions (user_id, revoked_at, last_active_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_sessions_session_id
  ON user_sessions (session_id);

-- 3) 安全验证码（登录 2FA、启用 2FA、关闭 2FA）
CREATE TABLE IF NOT EXISTS user_verification_codes (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purpose VARCHAR(32) NOT NULL,
  challenge_id VARCHAR(128) NULL UNIQUE,
  code VARCHAR(6) NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  used BOOLEAN NOT NULL DEFAULT FALSE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_verification_codes_lookup
  ON user_verification_codes (user_id, purpose, used, created_at DESC);
