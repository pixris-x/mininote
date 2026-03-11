-- 007_plan_start_date_and_share_token.sql
-- 步骤添加开始时间；计划添加分享 token

ALTER TABLE plan_steps
  ADD COLUMN IF NOT EXISTS start_date DATE;

ALTER TABLE plans
  ADD COLUMN IF NOT EXISTS share_token VARCHAR(64) UNIQUE;

CREATE INDEX IF NOT EXISTS idx_plans_share_token ON plans(share_token);
