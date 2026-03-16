-- 009_scheduler_logs.sql
-- 定时任务执行日志表

CREATE TABLE IF NOT EXISTS scheduler_logs (
  id          BIGSERIAL    PRIMARY KEY,
  task_name   VARCHAR(64)  NOT NULL,                  -- 任务标识，如 share_clean / orphan_clean / due_reminder
  status      VARCHAR(16)  NOT NULL DEFAULT 'success', -- success | error
  message     TEXT,                                    -- 执行结果摘要或错误信息
  affected    INTEGER      DEFAULT 0,                  -- 受影响的记录数（清理条数、发送邮件数等）
  duration_ms INTEGER,                                 -- 执行耗时（毫秒）
  executed_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- 按任务名 + 时间建索引，方便查询某任务的历史
CREATE INDEX IF NOT EXISTS idx_scheduler_logs_task_time
  ON scheduler_logs (task_name, executed_at DESC);
