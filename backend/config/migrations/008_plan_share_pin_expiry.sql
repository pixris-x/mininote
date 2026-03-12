-- 008_plan_share_pin_expiry.sql
-- 为计划分享功能新增：4位访问码 + 过期时间

ALTER TABLE plans
  ADD COLUMN IF NOT EXISTS share_pin     VARCHAR(4),
  ADD COLUMN IF NOT EXISTS share_expires_at TIMESTAMPTZ;
