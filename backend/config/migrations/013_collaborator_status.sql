-- 013_collaborator_status.sql
-- 协作邀请需要被邀请用户确认同意

ALTER TABLE plan_collaborators
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending' NOT NULL;

-- 已有记录设为已接受
UPDATE plan_collaborators SET status = 'accepted' WHERE status = 'pending';
