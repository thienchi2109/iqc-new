-- Add approval workflow columns to qc_runs table
-- This script adds the necessary columns for the explicit QC approval workflow

ALTER TABLE qc_runs 
ADD COLUMN IF NOT EXISTS auto_result text 
CHECK (auto_result IN ('pass','warn','fail'));

ALTER TABLE qc_runs 
ADD COLUMN IF NOT EXISTS approval_state text NOT NULL DEFAULT 'pending' 
CHECK (approval_state IN ('pending','approved','rejected'));

ALTER TABLE qc_runs 
ADD COLUMN IF NOT EXISTS approved_by uuid 
REFERENCES users(id);

ALTER TABLE qc_runs 
ADD COLUMN IF NOT EXISTS approved_at timestamptz;

ALTER TABLE qc_runs 
ADD COLUMN IF NOT EXISTS approval_note text;

-- Create index for efficient filtering by approval state
CREATE INDEX IF NOT EXISTS idx_qc_runs_approval 
ON qc_runs(approval_state, created_at);

-- Create index for efficient filtering by auto_result
CREATE INDEX IF NOT EXISTS idx_qc_runs_auto_result 
ON qc_runs(auto_result, created_at);

-- Optional: Backfill existing data - map legacy 'status' to auto_result
-- This is commented out to allow manual decision on backfill strategy
/*
UPDATE qc_runs 
SET auto_result = CASE 
  WHEN status = 'accepted' THEN 'pass'
  WHEN status = 'rejected' THEN 'fail'
  ELSE 'pass' -- default for pending
END
WHERE auto_result IS NULL;
*/
