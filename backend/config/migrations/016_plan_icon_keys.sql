-- 016_plan_icon_keys.sql
-- 迁移 016：计划 icon 从 emoji 升级为 icon key（兼容历史数据）

UPDATE plans
SET icon = CASE icon
  WHEN '🎯' THEN 'target'
  WHEN '🚀' THEN 'rocket'
  WHEN '💡' THEN 'lightbulb'
  WHEN '📚' THEN 'book'
  WHEN '💪' THEN 'dumbbell'
  WHEN '🌱' THEN 'sprout'
  WHEN '✨' THEN 'sparkles'
  WHEN '🏆' THEN 'trophy'
  WHEN '🎨' THEN 'palette'
  WHEN '🔬' THEN 'flask'
  WHEN '🌍' THEN 'globe'
  WHEN '❤️' THEN 'heart'
  WHEN '❤' THEN 'heart'
  ELSE icon
END
WHERE icon IN ('🎯', '🚀', '💡', '📚', '💪', '🌱', '✨', '🏆', '🎨', '🔬', '🌍', '❤️', '❤');

ALTER TABLE plans
  ALTER COLUMN icon SET DEFAULT 'target';
