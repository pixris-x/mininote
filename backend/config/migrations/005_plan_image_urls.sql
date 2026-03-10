-- 迁移 005：计划步骤多图支持
-- 将 image_url 单张图升级为 image_urls JSONB 数组

ALTER TABLE plan_steps
  ADD COLUMN IF NOT EXISTS image_urls JSONB DEFAULT '[]'::jsonb;

-- 将现有 image_url 数据迁移到 image_urls 数组（跳过空值）
UPDATE plan_steps
   SET image_urls = jsonb_build_array(image_url)
 WHERE image_url IS NOT NULL
   AND image_url <> ''
   AND (image_urls IS NULL OR image_urls = '[]'::jsonb);
