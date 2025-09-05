-- Create a database view for QC limits with pretty/human-readable fields
-- This view joins all related tables to provide a denormalized view with readable codes instead of UUIDs

CREATE OR REPLACE VIEW vw_qc_limits_pretty AS
SELECT 
    lim.id,
    t.code  AS test,
    t.name  AS test_name,
    d.code  AS device,
    d.name  AS device_name,
    ql.level AS level, -- L1/L2/L3
    lot.lot_code AS lot,
    lim.mean, 
    lim.sd, 
    lim.cv, 
    lim.source, 
    lim.created_by, 
    lim.test_id,
    lim.device_id,
    lim.level_id,
    lim.lot_id
FROM qc_limits lim
JOIN tests t      ON t.id  = lim.test_id
JOIN devices d    ON d.id  = lim.device_id
JOIN qc_levels ql ON ql.id = lim.level_id
JOIN qc_lots lot  ON lot.id = lim.lot_id;