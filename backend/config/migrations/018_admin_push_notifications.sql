-- 018_admin_push_notifications.sql
-- 管理员推送通知（立即发送 + 定时发送）任务表

CREATE TABLE IF NOT EXISTS admin_push_notifications (
  id            BIGSERIAL PRIMARY KEY,
  title         VARCHAR(120) NOT NULL,
  body          TEXT         NOT NULL,
  target        VARCHAR(32)  NOT NULL DEFAULT 'push_subscribed',
  target_url    VARCHAR(300) NOT NULL DEFAULT '/plans',
  scheduled_for TIMESTAMPTZ  NOT NULL,
  status        VARCHAR(20)  NOT NULL DEFAULT 'scheduled',
  total_count   INTEGER      NOT NULL DEFAULT 0,
  sent_count    INTEGER      NOT NULL DEFAULT 0,
  failed_count  INTEGER      NOT NULL DEFAULT 0,
  expired_count INTEGER      NOT NULL DEFAULT 0,
  last_error    TEXT,
  sent_at       TIMESTAMPTZ,
  created_by    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_admin_push_notifications_target
    CHECK (target IN ('push_subscribed')),
  CONSTRAINT chk_admin_push_notifications_status
    CHECK (status IN ('scheduled', 'sending', 'sent', 'failed'))
);

CREATE INDEX IF NOT EXISTS idx_admin_push_notifications_status_scheduled
  ON admin_push_notifications (status, scheduled_for ASC);

CREATE INDEX IF NOT EXISTS idx_admin_push_notifications_created_at
  ON admin_push_notifications (created_at DESC);
