-- 迁移 004：计划功能 — 计划表 + 计划步骤表

-- 计划主表
CREATE TABLE IF NOT EXISTS plans (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       VARCHAR(200) NOT NULL DEFAULT '新计划',
  description TEXT DEFAULT '',
  color       VARCHAR(20) DEFAULT '#FFFFFF',
  icon        VARCHAR(10) DEFAULT '🎯',
  status      VARCHAR(20) DEFAULT 'active'
                CHECK (status IN ('active', 'completed', 'paused')),
  sort_order  INTEGER DEFAULT 0,
  created_at  TIMESTAMP DEFAULT NOW(),
  updated_at  TIMESTAMP DEFAULT NOW()
);

-- 计划步骤表
CREATE TABLE IF NOT EXISTS plan_steps (
  id           SERIAL PRIMARY KEY,
  plan_id      INTEGER NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title        VARCHAR(200) NOT NULL DEFAULT '新步骤',
  description  TEXT DEFAULT '',
  status       VARCHAR(20) DEFAULT 'pending'
                 CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped')),
  badge        VARCHAR(50) DEFAULT '',   -- 特殊标识，如"里程碑"、"重要"等
  badge_color  VARCHAR(20) DEFAULT '',
  image_url    VARCHAR(500) DEFAULT '',
  due_date     DATE,
  completed_at TIMESTAMP,
  sort_order   INTEGER DEFAULT 0,
  created_at   TIMESTAMP DEFAULT NOW(),
  updated_at   TIMESTAMP DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_plans_user_id       ON plans(user_id);
CREATE INDEX IF NOT EXISTS idx_plans_status        ON plans(user_id, status);
CREATE INDEX IF NOT EXISTS idx_plan_steps_plan_id  ON plan_steps(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_steps_user_id  ON plan_steps(user_id);

-- 自动更新 updated_at
CREATE TRIGGER update_plans_updated_at
  BEFORE UPDATE ON plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_plan_steps_updated_at
  BEFORE UPDATE ON plan_steps
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
