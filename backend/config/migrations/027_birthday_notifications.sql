-- 027_birthday_notifications.sql
-- 生日提醒通知中心接入

ALTER TABLE user_notifications
  DROP CONSTRAINT IF EXISTS chk_user_notifications_type;

ALTER TABLE user_notifications
  ADD CONSTRAINT chk_user_notifications_type
    CHECK (type IN ('push', 'due_reminder', 'birthday_reminder', 'system'));

CREATE TABLE IF NOT EXISTS birthday_notification_logs (
  id              BIGSERIAL PRIMARY KEY,
  user_id         INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  birthday_id     INTEGER      NOT NULL REFERENCES birthdays(id) ON DELETE CASCADE,
  occurrence_date DATE         NOT NULL,
  offset_days     SMALLINT     NOT NULL,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_birthday_notification_logs_offset
    CHECK (offset_days IN (0, 3, 7)),
  CONSTRAINT uq_birthday_notification_logs_once
    UNIQUE (user_id, birthday_id, occurrence_date, offset_days)
);

CREATE INDEX IF NOT EXISTS idx_birthday_notification_logs_user_created
  ON birthday_notification_logs (user_id, created_at DESC);
