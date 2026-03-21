-- 024_user_notifications.sql
-- 用户通知中心：统一聚合 Push、到期提醒、系统消息

CREATE TABLE IF NOT EXISTS user_notifications (
  id         BIGSERIAL PRIMARY KEY,
  user_id    INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       VARCHAR(24)  NOT NULL DEFAULT 'system',
  source     VARCHAR(40)  NOT NULL DEFAULT 'app',
  title      VARCHAR(120) NOT NULL,
  content    TEXT         NOT NULL,
  link_url   VARCHAR(300) NOT NULL DEFAULT '/plans',
  payload    JSONB        NOT NULL DEFAULT '{}'::jsonb,
  is_read    BOOLEAN      NOT NULL DEFAULT FALSE,
  read_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_user_notifications_type
    CHECK (type IN ('push', 'due_reminder', 'system'))
);

CREATE INDEX IF NOT EXISTS idx_user_notifications_user_created
  ON user_notifications (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_notifications_unread
  ON user_notifications (user_id, is_read, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_notifications_user_type
  ON user_notifications (user_id, type, created_at DESC);
