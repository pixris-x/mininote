-- 019_notes_list_query_indexes.sql
-- 优化记事列表查询性能（筛选 + 排序 + 关键字搜索）

-- 记事列表常用条件：
-- WHERE user_id = ? AND is_archived = ? [AND is_pinned = ?]
-- ORDER BY is_pinned DESC, updated_at DESC
CREATE INDEX IF NOT EXISTS idx_notes_user_archived_pinned_updated
  ON notes (user_id, is_archived, is_pinned DESC, updated_at DESC);

-- 可选筛选场景（置顶筛选）
CREATE INDEX IF NOT EXISTS idx_notes_user_archived_pinned
  ON notes (user_id, is_archived, is_pinned);

-- 搜索（ILIKE）优化：优先尝试启用 pg_trgm，若权限不足则跳过 trigram 索引
DO $$
BEGIN
  BEGIN
    CREATE EXTENSION IF NOT EXISTS pg_trgm;
  EXCEPTION
    WHEN insufficient_privilege THEN
      RAISE NOTICE 'skip CREATE EXTENSION pg_trgm due to insufficient privilege';
  END;

  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_notes_title_trgm ON notes USING GIN (title gin_trgm_ops)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_notes_content_trgm ON notes USING GIN (content gin_trgm_ops)';
  ELSE
    RAISE NOTICE 'skip trigram indexes because pg_trgm is unavailable';
  END IF;
END $$;
