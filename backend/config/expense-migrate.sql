-- ========================
-- 记账模块数据库迁移
-- ========================

-- 消费类型表（user_id 为 NULL 表示系统默认分类）
CREATE TABLE IF NOT EXISTS expense_categories (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name       VARCHAR(50) NOT NULL,
  icon       VARCHAR(10) DEFAULT '💰',
  color      VARCHAR(20) DEFAULT '#a29bfe',
  is_default BOOLEAN DEFAULT FALSE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 消费记录表
CREATE TABLE IF NOT EXISTS expenses (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id INTEGER REFERENCES expense_categories(id) ON DELETE SET NULL,
  amount      DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  note        TEXT DEFAULT '',
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(user_id, expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_expense_categories_user ON expense_categories(user_id);

-- 插入系统默认分类（user_id = NULL，is_default = TRUE）
INSERT INTO expense_categories (user_id, name, icon, color, is_default, sort_order) VALUES
  (NULL, '餐饮',   '🍜', '#fd79a8', TRUE, 1),
  (NULL, '交通',   '🚌', '#74b9ff', TRUE, 2),
  (NULL, '购物',   '🛍️', '#a29bfe', TRUE, 3),
  (NULL, '娱乐',   '🎮', '#ffeaa7', TRUE, 4),
  (NULL, '医疗',   '💊', '#ff7675', TRUE, 5),
  (NULL, '住房',   '🏠', '#55efc4', TRUE, 6),
  (NULL, '通讯',   '📱', '#81ecec', TRUE, 7),
  (NULL, '教育',   '📚', '#fdcb6e', TRUE, 8),
  (NULL, '旅行',   '✈️', '#6c5ce7', TRUE, 9),
  (NULL, '运动',   '🏃', '#00b894', TRUE, 10),
  (NULL, '宠物',   '🐾', '#e17055', TRUE, 11),
  (NULL, '其他',   '📦', '#b2bec3', TRUE, 12)
ON CONFLICT DO NOTHING;
