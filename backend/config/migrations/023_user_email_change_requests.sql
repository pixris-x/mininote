-- 023_user_email_change_requests.sql
-- 账号安全：修改邮箱验证码

CREATE TABLE IF NOT EXISTS user_email_change_requests (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  new_email VARCHAR(255) NOT NULL,
  code VARCHAR(6) NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  used BOOLEAN NOT NULL DEFAULT FALSE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_email_change_requests_user
  ON user_email_change_requests (user_id, used, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_email_change_requests_email
  ON user_email_change_requests (new_email, used);
