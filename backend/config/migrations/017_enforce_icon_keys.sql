-- 017_enforce_icon_keys.sql
-- 迁移 017：强约束 icon 字段仅允许 key，防止回退到 emoji

-- 1) 清理历史脏数据，统一为合法默认值
UPDATE plans
SET icon = 'target'
WHERE icon IS NULL
   OR BTRIM(icon) = ''
   OR icon NOT IN ('target','rocket','lightbulb','book','dumbbell','sprout','sparkles','trophy','palette','flask','globe','heart');

UPDATE expense_categories
SET icon = 'tag'
WHERE icon IS NULL
   OR BTRIM(icon) = ''
   OR icon NOT IN (
     'food','noodles','pizza','fish','salad','drink','dessert','meat','meal_box','beer',
     'car','bus','subway','plane','bike','fuel','ship',
     'shopping','clothes','makeup','gift','jewel',
     'game','movie','music','art','study','goal','theater','dice',
     'medicine','hospital','fitness','sports',
     'home','light','phone','laptop','tool','package','clean','money','note','flower','pet','tag'
   );

-- 2) 默认值与非空约束
ALTER TABLE plans
  ALTER COLUMN icon SET DEFAULT 'target',
  ALTER COLUMN icon SET NOT NULL;

ALTER TABLE expense_categories
  ALTER COLUMN icon SET DEFAULT 'tag',
  ALTER COLUMN icon SET NOT NULL;

-- 3) 白名单约束
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_plans_icon_key'
  ) THEN
    ALTER TABLE plans
      ADD CONSTRAINT chk_plans_icon_key
      CHECK (icon IN ('target','rocket','lightbulb','book','dumbbell','sprout','sparkles','trophy','palette','flask','globe','heart'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_expense_categories_icon_key'
  ) THEN
    ALTER TABLE expense_categories
      ADD CONSTRAINT chk_expense_categories_icon_key
      CHECK (
        icon IN (
          'food','noodles','pizza','fish','salad','drink','dessert','meat','meal_box','beer',
          'car','bus','subway','plane','bike','fuel','ship',
          'shopping','clothes','makeup','gift','jewel',
          'game','movie','music','art','study','goal','theater','dice',
          'medicine','hospital','fitness','sports',
          'home','light','phone','laptop','tool','package','clean','money','note','flower','pet','tag'
        )
      );
  END IF;
END $$;
