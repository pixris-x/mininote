-- 025_plan_share_visit_controls.sql
-- 分享访问控制：次数限制 + 访问统计

ALTER TABLE plans
  ADD COLUMN IF NOT EXISTS share_max_visits INTEGER,
  ADD COLUMN IF NOT EXISTS share_visit_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS share_last_visited_at TIMESTAMPTZ;

ALTER TABLE plans
  DROP CONSTRAINT IF EXISTS chk_plans_share_max_visits;

ALTER TABLE plans
  ADD CONSTRAINT chk_plans_share_max_visits
  CHECK (share_max_visits IS NULL OR share_max_visits > 0);
