-- Migration: Add QC Limit Proposals table for Rolling-N auto-recalculation feature
-- Date: 2025-09-10
-- Purpose: Enable audit-ready proposal workflow for QC limit updates

-- Create qc_limit_proposals table
CREATE TABLE IF NOT EXISTS qc_limit_proposals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id UUID NOT NULL,
    level_id UUID NOT NULL, 
    lot_id UUID NOT NULL,
    device_id UUID NOT NULL,
    rolling_n INT NOT NULL CHECK (rolling_n >= 20),
    window_from TIMESTAMPTZ NOT NULL,
    window_to TIMESTAMPTZ NOT NULL,
    mean NUMERIC(12,4) NOT NULL,
    sd NUMERIC(12,4) NOT NULL CHECK (sd >= 0),
    cv NUMERIC(6,2) NOT NULL,
    excluded_count INT NOT NULL DEFAULT 0 CHECK (excluded_count >= 0),
    excluded_rules TEXT[] NOT NULL DEFAULT '{}',
    reasons JSONB NOT NULL DEFAULT '[]'::jsonb,
    notes TEXT,
    status TEXT NOT NULL CHECK (status IN ('pending','approved','skipped')) DEFAULT 'pending',
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    approved_by UUID,
    approved_at TIMESTAMPTZ,
    applied_limit_id UUID,
    
    -- Foreign key constraints
    CONSTRAINT fk_qclp_test FOREIGN KEY (test_id) REFERENCES tests(id) ON DELETE CASCADE,
    CONSTRAINT fk_qclp_level FOREIGN KEY (level_id) REFERENCES qc_levels(id) ON DELETE CASCADE,
    CONSTRAINT fk_qclp_lot FOREIGN KEY (lot_id) REFERENCES qc_lots(id) ON DELETE CASCADE,
    CONSTRAINT fk_qclp_device FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE,
    CONSTRAINT fk_qclp_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_qclp_approved_by FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_qclp_applied_limit FOREIGN KEY (applied_limit_id) REFERENCES qc_limits(id) ON DELETE SET NULL,
    
    -- Business logic constraints
    CONSTRAINT chk_qclp_approval_consistency CHECK (
        (status = 'approved' AND approved_by IS NOT NULL AND approved_at IS NOT NULL) OR
        (status != 'approved' AND approved_by IS NULL AND approved_at IS NULL)
    ),
    CONSTRAINT chk_qclp_window_order CHECK (window_to >= window_from)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_qclp_group_status ON qc_limit_proposals(test_id, level_id, lot_id, device_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_qclp_status ON qc_limit_proposals(status);
CREATE INDEX IF NOT EXISTS idx_qclp_created_at ON qc_limit_proposals(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_qclp_approved_at ON qc_limit_proposals(approved_at DESC) WHERE approved_at IS NOT NULL;

-- Comment the table
COMMENT ON TABLE qc_limit_proposals IS 'Stores Rolling-N QC limit proposals for approval workflow';
COMMENT ON COLUMN qc_limit_proposals.rolling_n IS 'Number of in-control runs used for calculation (minimum 20)';
COMMENT ON COLUMN qc_limit_proposals.excluded_count IS 'Number of runs excluded due to Westgard rule violations';
COMMENT ON COLUMN qc_limit_proposals.excluded_rules IS 'Array of rule codes that caused run exclusions';
COMMENT ON COLUMN qc_limit_proposals.reasons IS 'JSON array of eligibility check results and computed stats';
