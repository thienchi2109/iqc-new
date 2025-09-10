-- Migration: Add performance indexes for Rolling-N computation
-- Date: 2025-09-10  
-- Purpose: Optimize queries for finding last N in-control QC runs

-- Add compound index on qc_runs for Rolling-N window queries
-- This index supports: WHERE test_id=? AND level_id=? AND lot_id=? AND device_id=? AND status=? ORDER BY run_at DESC
CREATE INDEX IF NOT EXISTS idx_qc_runs_rolling_window
ON qc_runs(test_id, level_id, lot_id, device_id, status, run_at DESC);

-- Add index on violations for exclusion filtering
-- This supports: WHERE run_id IN (...) AND rule_code = ANY(...)
CREATE INDEX IF NOT EXISTS idx_violations_run_rule 
ON violations(run_id, rule_code);

-- Add index for run_at queries (date span calculations)
CREATE INDEX IF NOT EXISTS idx_qc_runs_run_at ON qc_runs(run_at);

-- Comment the indexes
COMMENT ON INDEX idx_qc_runs_rolling_window IS 'Optimizes Rolling-N window queries for proposal computation';
COMMENT ON INDEX idx_violations_run_rule IS 'Optimizes Westgard rule exclusion filtering';
