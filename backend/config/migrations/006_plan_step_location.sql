-- 006_plan_step_location.sql
-- 为计划步骤添加地点字段（用于跳转地图导航）

ALTER TABLE plan_steps
  ADD COLUMN IF NOT EXISTS location TEXT DEFAULT '';
