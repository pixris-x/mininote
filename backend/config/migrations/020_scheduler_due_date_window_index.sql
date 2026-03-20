-- 020_scheduler_due_date_window_index.sql
-- 优化定时任务中“明日到期步骤”扫描
-- 场景：status 未完成 + due_date 范围（>= 明天 且 < 后天）

CREATE INDEX IF NOT EXISTS idx_plan_steps_due_date_user_active
  ON plan_steps (due_date, user_id)
  WHERE due_date IS NOT NULL
    AND status NOT IN ('completed', 'skipped');

