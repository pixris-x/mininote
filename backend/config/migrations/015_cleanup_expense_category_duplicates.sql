-- 015_cleanup_expense_category_duplicates.sql
-- 迁移 015：清理 expense_categories 重复分类，并防止重复再次产生

-- 1) 将重复分类上已有消费记录，迁移到同组保留分类
WITH ranked AS (
  SELECT
    id,
    FIRST_VALUE(id) OVER (
      PARTITION BY user_id, name
      ORDER BY is_default DESC, sort_order ASC NULLS LAST, created_at ASC NULLS LAST, id ASC
    ) AS keep_id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, name
      ORDER BY is_default DESC, sort_order ASC NULLS LAST, created_at ASC NULLS LAST, id ASC
    ) AS rn
  FROM expense_categories
), dups AS (
  SELECT id AS dup_id, keep_id
  FROM ranked
  WHERE rn > 1
)
UPDATE expenses e
SET category_id = d.keep_id
FROM dups d
WHERE e.category_id = d.dup_id
  AND e.category_id IS DISTINCT FROM d.keep_id;

-- 2) 删除重复分类，仅保留每组一条
WITH ranked AS (
  SELECT
    id,
    FIRST_VALUE(id) OVER (
      PARTITION BY user_id, name
      ORDER BY is_default DESC, sort_order ASC NULLS LAST, created_at ASC NULLS LAST, id ASC
    ) AS keep_id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, name
      ORDER BY is_default DESC, sort_order ASC NULLS LAST, created_at ASC NULLS LAST, id ASC
    ) AS rn
  FROM expense_categories
), dups AS (
  SELECT id AS dup_id, keep_id
  FROM ranked
  WHERE rn > 1
)
DELETE FROM expense_categories c
USING dups d
WHERE c.id = d.dup_id;

-- 3) 增加唯一约束索引，避免未来重复（系统分类 + 用户分类）
CREATE UNIQUE INDEX IF NOT EXISTS uq_expense_categories_system_name
  ON expense_categories (name)
  WHERE user_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_expense_categories_user_name
  ON expense_categories (user_id, name)
  WHERE user_id IS NOT NULL;
