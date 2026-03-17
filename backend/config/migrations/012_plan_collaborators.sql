-- 012_plan_collaborators.sql
-- 计划协作者表：被邀请的用户可以编辑计划步骤，但不能邀请他人

CREATE TABLE IF NOT EXISTS plan_collaborators (
  id          SERIAL PRIMARY KEY,
  plan_id     INTEGER NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  added_at    TIMESTAMP DEFAULT NOW(),
  UNIQUE(plan_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_plan_collaborators_user ON plan_collaborators(user_id);
CREATE INDEX IF NOT EXISTS idx_plan_collaborators_plan ON plan_collaborators(plan_id);
