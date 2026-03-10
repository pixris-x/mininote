-- 迁移 001：添加管理员字段 + 系统日志表

ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS system_logs (
  id          SERIAL PRIMARY KEY,
  level       VARCHAR(10) NOT NULL DEFAULT 'error',  -- 'error' | 'warn' | 'info'
  message     TEXT NOT NULL,
  route       VARCHAR(200),
  method      VARCHAR(10),
  status_code INTEGER,
  error_stack TEXT,
  user_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  ip          VARCHAR(50),
  created_at  TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_system_logs_level      ON system_logs(level);
CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON system_logs(created_at DESC);
