-- 026_birthdays.sql
-- 日历生日提醒

CREATE TABLE IF NOT EXISTS birthdays (
  id             SERIAL PRIMARY KEY,
  user_id        INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title          VARCHAR(80)  NOT NULL,
  solar_date     DATE         NOT NULL,
  is_lunar       BOOLEAN      NOT NULL DEFAULT FALSE,
  lunar_month    SMALLINT,
  lunar_day      SMALLINT,
  lunar_is_leap  BOOLEAN      NOT NULL DEFAULT FALSE,
  repeat_type    VARCHAR(16)  NOT NULL DEFAULT 'yearly',
  notify_enabled BOOLEAN      NOT NULL DEFAULT TRUE,
  notify_time    TIME         NOT NULL DEFAULT '09:00:00',
  remind_offsets INTEGER[]    NOT NULL DEFAULT ARRAY[0]::INTEGER[],
  color          VARCHAR(20)  NOT NULL DEFAULT '#FF6B6B',
  note           TEXT,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
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

CREATE INDEX IF NOT EXISTS idx_birthdays_user_id
  ON birthdays (user_id, updated_at DESC);
