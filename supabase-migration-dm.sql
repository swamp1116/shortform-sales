-- businesses 테이블에 DM 관련 컬럼 추가
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS dm_message text;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS dm_status text DEFAULT 'pending' CHECK (dm_status IN ('pending', 'sent', 'replied'));
