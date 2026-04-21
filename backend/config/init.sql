-- Mini Note 数据库初始化脚本
-- 请在 PostgreSQL 中执行此脚本

-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  nickname VARCHAR(50),
  avatar_color VARCHAR(20) DEFAULT '#FFB3C6',
  theme VARCHAR(20) DEFAULT 'pink',
  bio TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 记事（笔记）表
CREATE TABLE IF NOT EXISTS notes (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL DEFAULT '无标题',
  content TEXT,
  color VARCHAR(20) DEFAULT '#FFFFFF',
  tags TEXT[] DEFAULT '{}',
  is_pinned BOOLEAN DEFAULT FALSE,
  is_archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 日历记事关联表
CREATE TABLE IF NOT EXISTS calendar_notes (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  note_id INTEGER REFERENCES notes(id) ON DELETE CASCADE,
  calendar_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(note_id, calendar_date)
);

-- 生日提醒表
CREATE TABLE IF NOT EXISTS birthdays (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title         VARCHAR(80)  NOT NULL,
  solar_date    DATE         NOT NULL,
  is_lunar      BOOLEAN      NOT NULL DEFAULT FALSE,
  lunar_month   SMALLINT,
  lunar_day     SMALLINT,
  lunar_is_leap BOOLEAN      NOT NULL DEFAULT FALSE,
  repeat_type   VARCHAR(16)  NOT NULL DEFAULT 'yearly',
  notify_enabled BOOLEAN     NOT NULL DEFAULT TRUE,
  notify_time   TIME         NOT NULL DEFAULT '09:00:00',
  remind_offsets INTEGER[]   NOT NULL DEFAULT ARRAY[0]::INTEGER[],
  color         VARCHAR(20)  NOT NULL DEFAULT '#FF6B6B',
  note          TEXT,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_birthdays_repeat_type
    CHECK (repeat_type IN ('none', 'yearly')),
  CONSTRAINT chk_birthdays_lunar_fields
    CHECK (
      is_lunar = FALSE
      OR (
        lunar_month BETWEEN 1 AND 12
        AND lunar_day BETWEEN 1 AND 30
      )
    ),
  CONSTRAINT chk_birthdays_remind_offsets
    CHECK (remind_offsets <@ ARRAY[0,3,7]::INTEGER[])
);

-- 索引优化
CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_created_at ON notes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_calendar_notes_user_date ON calendar_notes(user_id, calendar_date);
CREATE INDEX IF NOT EXISTS idx_birthdays_user_id ON birthdays(user_id, updated_at DESC);

-- 自动更新 updated_at 触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notes_updated_at
  BEFORE UPDATE ON notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 系统日志表
CREATE TABLE IF NOT EXISTS system_logs (
  id SERIAL PRIMARY KEY,
  level VARCHAR(10) NOT NULL DEFAULT 'error',
  message TEXT NOT NULL,
  route VARCHAR(200),
  method VARCHAR(10),
  status_code INTEGER,
  error_stack TEXT,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  ip VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_system_logs_level ON system_logs(level);
CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON system_logs(created_at DESC);
