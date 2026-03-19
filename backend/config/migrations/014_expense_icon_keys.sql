-- 014_expense_icon_keys.sql
-- 迁移 014：消费分类 icon 从 emoji 升级为 icon key（兼容历史数据）

UPDATE expense_categories
SET icon = CASE icon
  WHEN '🍔' THEN 'food'
  WHEN '🍜' THEN 'noodles'
  WHEN '🍕' THEN 'pizza'
  WHEN '🍣' THEN 'fish'
  WHEN '🥗' THEN 'salad'
  WHEN '🧋' THEN 'drink'
  WHEN '🍰' THEN 'dessert'
  WHEN '🥩' THEN 'meat'
  WHEN '🍱' THEN 'meal_box'
  WHEN '🍺' THEN 'beer'

  WHEN '🚗' THEN 'car'
  WHEN '🚌' THEN 'bus'
  WHEN '🚇' THEN 'subway'
  WHEN '✈️' THEN 'plane'
  WHEN '✈' THEN 'plane'
  WHEN '🚕' THEN 'car'
  WHEN '🛵' THEN 'bike'
  WHEN '🚲' THEN 'bike'
  WHEN '⛽' THEN 'fuel'
  WHEN '🚢' THEN 'ship'
  WHEN '🚁' THEN 'plane'

  WHEN '🛒' THEN 'shopping'
  WHEN '👗' THEN 'clothes'
  WHEN '👟' THEN 'clothes'
  WHEN '💄' THEN 'makeup'
  WHEN '🧴' THEN 'package'
  WHEN '🎁' THEN 'gift'
  WHEN '💍' THEN 'jewel'
  WHEN '🧸' THEN 'gift'
  WHEN '🛍️' THEN 'shopping'
  WHEN '🛍' THEN 'shopping'
  WHEN '👔' THEN 'clothes'

  WHEN '🎮' THEN 'game'
  WHEN '🎬' THEN 'movie'
  WHEN '🎵' THEN 'music'
  WHEN '🎨' THEN 'art'
  WHEN '📚' THEN 'study'
  WHEN '🎯' THEN 'goal'
  WHEN '🎳' THEN 'dice'
  WHEN '🎭' THEN 'theater'
  WHEN '🎠' THEN 'theater'
  WHEN '🎲' THEN 'dice'

  WHEN '💊' THEN 'medicine'
  WHEN '🏥' THEN 'hospital'
  WHEN '🦷' THEN 'hospital'
  WHEN '💪' THEN 'fitness'
  WHEN '🧘' THEN 'sports'
  WHEN '🏃' THEN 'sports'
  WHEN '⚽' THEN 'sports'
  WHEN '🏊' THEN 'sports'
  WHEN '🎾' THEN 'sports'
  WHEN '🧗' THEN 'sports'

  WHEN '🏠' THEN 'home'
  WHEN '💡' THEN 'light'
  WHEN '📱' THEN 'phone'
  WHEN '💻' THEN 'laptop'
  WHEN '🔧' THEN 'tool'
  WHEN '📦' THEN 'package'
  WHEN '🧹' THEN 'clean'
  WHEN '💰' THEN 'money'
  WHEN '📝' THEN 'note'
  WHEN '🌸' THEN 'flower'
  WHEN '🐾' THEN 'pet'
  WHEN '🏷️' THEN 'tag'
  WHEN '🏷' THEN 'tag'
  ELSE icon
END
WHERE icon IN (
  '🍔','🍜','🍕','🍣','🥗','🧋','🍰','🥩','🍱','🍺',
  '🚗','🚌','🚇','✈️','✈','🚕','🛵','🚲','⛽','🚢','🚁',
  '🛒','👗','👟','💄','🧴','🎁','💍','🧸','🛍️','🛍','👔',
  '🎮','🎬','🎵','🎨','📚','🎯','🎳','🎭','🎠','🎲',
  '💊','🏥','🦷','💪','🧘','🏃','⚽','🏊','🎾','🧗',
  '🏠','💡','📱','💻','🔧','📦','🧹','💰','📝','🌸','🐾','🏷️','🏷'
);
