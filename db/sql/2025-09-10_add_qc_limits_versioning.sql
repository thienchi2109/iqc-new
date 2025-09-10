-- Migration: Add versioning support to qc_limits table
-- Date: 2025-09-10
-- Purpose: Enable audit trail and versioning for QC limit changes

-- Add versioning columns to qc_limits
ALTER TABLE qc_limits 
ADD COLUMN IF NOT EXISTS effective_from TIMESTAMPTZ NOT NULL DEFAULT now(),
ADD COLUMN IF NOT EXISTS effective_to TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- Drop the existing unique index (it prevents versioning)
DROP INDEX IF EXISTS qc_limits_unique_idx;

-- Create new partial unique index (only one active version per group)
CREATE UNIQUE INDEX IF NOT EXISTS idx_qc_limits_active_unique 
ON qc_limits(test_id, level_id, lot_id, device_id) 
WHERE effective_to IS NULL;

-- Create index for version queries
CREATE INDEX IF NOT EXISTS idx_qc_limits_effective_period 
ON qc_limits(test_id, level_id, lot_id, device_id, effective_from DESC, effective_to);

-- Create index for performance on effective dates
CREATE INDEX IF NOT EXISTS idx_qc_limits_effective_from ON qc_limits(effective_from);
CREATE INDEX IF NOT EXISTS idx_qc_limits_effective_to ON qc_limits(effective_to) WHERE effective_to IS NOT NULL;

-- Add check constraint for versioning logic
ALTER TABLE qc_limits 
ADD CONSTRAINT chk_qc_limits_version_order 
CHECK (effective_to IS NULL OR effective_to >= effective_from);

-- Comment the new columns
COMMENT ON COLUMN qc_limits.effective_from IS 'When this version of limits became active';
COMMENT ON COLUMN qc_limits.effective_to IS 'When this version was superseded (NULL = current active)';
COMMENT ON COLUMN qc_limits.approved_by IS 'User who approved this version of limits';
