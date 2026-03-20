-- 022_plan_step_templates_and_recurrence.sql
-- 计划步骤模板 + 按天/周/月批量生成能力

-- 步骤模板表（仅属于个人）
CREATE TABLE IF NOT EXISTS plan_step_templates (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT DEFAULT '',
  status VARCHAR(20) DEFAULT 'pending' CHECK (
    status IN ('pending', 'in_progress', 'completed', 'skipped')
  ),
  badge VARCHAR(50) DEFAULT '',
  badge_color VARCHAR(20) DEFAULT '',
  image_urls JSONB DEFAULT '[]'::jsonb,
  location TEXT DEFAULT '',
  start_date DATE,
  due_date DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 同一用户模板名唯一（忽略大小写）
CREATE UNIQUE INDEX IF NOT EXISTS uk_plan_step_templates_user_name_ci
  ON plan_step_templates (user_id, LOWER(name));

CREATE INDEX IF NOT EXISTS idx_plan_step_templates_user_updated
  ON plan_step_templates (user_id, updated_at DESC);

-- 自动更新 updated_at（避免重复创建触发器）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'update_plan_step_templates_updated_at'
      AND tgrelid = 'plan_step_templates'::regclass
  ) THEN
    CREATE TRIGGER update_plan_step_templates_updated_at
      BEFORE UPDATE ON plan_step_templates
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;
