To ground the plan in your project's specific guidance, I’ll read the referenced markdown file to extract the detailed logic and recommendations.

Read AutoRecalculationofQClimits_theory.md

To align the plan precisely with your current database schema and avoid wrong assumptions, I’ll inspect the qcLimits table definition in schema.ts and check if proposals/versioning columns already exist.

Ran find_symbol Serena-MCP (MCP Server)
To tailor the plan precisely and avoid conflicts with existing endpoints, I’ll quickly inspect the current route.ts implementation to understand existing behavior.

Read route.ts

Here’s a focused plan to add the Rolling-N auto-recalc engine and L‑J overlays. I read AutoRecalculationofQClimits_theory.md, inspected your qc_limits schema and current /api/qc/limits route to align the design precisely.

Checklist (requirements)
Auto-calc mean/SD from last N in-control runs (N>=20, configurable)
Exclude OOC by Westgard rules (1_3s, 2_2s, R_4s, 4_1s, 10x; 1_2s warning excluded from estimation)
Only propose when eligible (≥20 in-control over ≥10 days span)
Versioning + approval workflow; no auto-apply
L‑J overlays: Manufacturer/Peer, Observed (Rolling‑N), Cumulative‑by‑Lot, each with stats (N, date span, mean, SD, CV)
Toggle overlays, view change history
Documentation included (Westgard/CAP/CLSI)
Progress checkpoint

Read the theory markdown and extracted best practices, SQL patterns, and UX.
Verified your DB schema: qc_limits exists (id, group keys, mean/sd/cv, source, createdBy) with a unique index on (testId, levelId, lotId, deviceId); no versioning fields; no proposals table.
Reviewed current API for limits: CRUD at route.ts; no proposal endpoints or history.
Proposed design
1) Data model
Option A (audit‑ready; recommended):
Add table qc_limit_proposals to persist proposals and approvals (pending/approved/skipped), with: testId, levelId, lotId, deviceId, rollingN, window_from/to, mean, sd, cv, excluded_count, excluded_rules[], reasons jsonb, notes, created_by/at, approved_by/at, applied_limit_id, status.
Extend qc_limits for versioning:
Add effective_from TIMESTAMPTZ NOT NULL DEFAULT now()
Add effective_to TIMESTAMPTZ NULL
Add approved_by UUID NULL
Replace unique index with one that allows multiple versions (e.g., partial unique where effective_to IS NULL), or relax uniqueness and enforce one active (effective_to IS NULL) per group.
Option B (minimal; stateless proposals):
Keep qc_limits schema as-is (no history).
No proposals table; compute proposal on-demand; apply overwrites current row (still audited via AuditLogger).
Not audit‑ideal; use only if schema churn is a blocker.
Indexes to add

qc_runs(test_id, level_id, lot_id, device_id, run_at DESC, status) to speed last-N window.
violations(run_id, rule_code) to filter exclusions efficiently.
qc_limit_proposals(test_id, level_id, lot_id, device_id, status, created_at DESC).
2) Rolling‑N compute (service/repo)
New: lib/qc/rollingLimits.ts
computeRollingProposal({ testCode, level, lotCode, deviceCode, n=20 }) -> { eligible, reasons[], n, from, to, mean, sd, cv, excludedCount }
Logic:
Resolve group ids (tests, levels, lots, devices).
Select last N runs for group where status IN ['accepted'] and NOT EXISTS violations in ['1-3s','2-2s','R-4s','4-1s','10x','1-2s'] ordered by run_at desc limit N.
Compute span (min/max run_at), require n>=20 and span>=10 working days (approx by distinct date count or (to-from)>=10 days; pick one and document).
mean = avg(value), sd = stddev_samp(value), cv = sd/mean*100 (guard mean==0).
Return eligibility + stats + excludedCount (N filtered out).
Optional robustifying for 20<=N<40 (winsorize 5%) flagged behind a param.
3) API endpoints
GET /api/qc/limits/proposal (on-demand)
Query: testCode, level, lotCode, deviceCode, n?=20
Response: { ok, group, window:{n,from,to}, stats:{mean,sd,cv}, currentLimits:{mean,sd,cv,source}, eligible, reasons[], excludedCount }
POST /api/qc/limits/apply (minimal path)
Body: group keys + stats + rollingN + approvedByUserId
Behavior: upsert/overwrite qc_limits row with source='lab', compute cv server-side, audit create/update
Audit‑ready path (Option A):
POST /api/qc/limits/proposals → persist proposal (pending)
GET /api/qc/limits/proposals → list (filters by status/group/paging)
POST /api/qc/limits/proposals/:id/approve → create a new versioned qc_limits (source='lab', effective_from=now), set proposal status=approved, applied_limit_id
POST /api/qc/limits/proposals/:id/skip → status=skipped, add reason
Auth

Require role QA/Director for apply/approve. Reuse existing withAuth/withConfigAudit.
4) L‑J overlays and UI
In LeveyJenningsChart.tsx (or LjPanel):
Add selector “Giới hạn”: Manufacturer/Peer | Observed (Rolling‑N) | Cumulative‑by‑Lot.
When Observed selected:
Show N input (min 20, default 20).
Call GET /api/qc/limits/proposal to fetch stats and band; display badge: “N, from→to, mean/sd/cv; note: OOC excluded”.
If eligible, show CTA “Tạo đề xuất / Áp dụng (QA)”. If Option A: open Drawer to submit a persisted proposal for later approval in Inbox. If Option B: allow immediate apply (guarded by role).
Cumulative-by-Lot: compute across all accepted in-control runs for the lot (same exclusions), using all available to-date; show its stats.
All overlays: draw ±1/±2/±3 SD grid from selected band; keep Westgard markers overlay as-is.
Approval Inbox
Add a “QC Limit Proposals” tab displaying proposals with N, span, mean/sd/cv current vs proposed, %Δmean/%ΔCV, excludedCount; Approve/Skip (bulk supported).
5) Version selection for charting
For Manufacturer/Peer: use current qc_limits record where source='manufacturer' (or lab last-approved if desired).
For Rolling‑N: use on-demand computed stats; do not persist until approved.
For Cumulative-by-Lot: compute on-demand until you decide to persist a “long-term” band.
If versioning added to qc_limits, expose history endpoint to power a change history drawer.
6) Migrations (Option A)
Add qc_limit_proposals table (see the theory doc outline).
Alter qc_limits:
ADD COLUMN effective_from timestamptz not null default now()
ADD COLUMN effective_to timestamptz
ADD COLUMN approved_by uuid null references users(id)
Drop unique idx; add partial unique idx on (test_id,level_id,lot_id,device_id) WHERE effective_to IS NULL
Add FK indexes and group index to qc_runs; ensure violations has (run_id, rule_code).
7) Tests
Unit:
computeRollingProposal filters OOC correctly and enforces N>=20 and span>=10 days.
CV guard on mean≈0.
Integration:
GET /proposal returns eligible=false for N<20 or insufficient span.
POST /apply (or proposals/:id/approve) updates/creates limits; AuditLogger logs.
UI:
Chart switches overlays; badge stats render; empty-state when ineligible.
Seed add-on: include enough runs for at least one group to exceed N.
8) Feature flags and rollout
Flags: ROLLING_LIMITS_ENGINE, ROLLING_LIMITS_UI, (optional) ROLLING_LIMITS_PROPOSALS.
Stage in dev/staging; document differences Manufacturer vs Observed.
9) Edge cases
No manufacturer limits yet: allow Observed if eligible; otherwise show helpful empty state.
Mean near zero: CV null with warning.
Lot/device/method changes: never mix; reset windows.
Maintenance/calibration: excluded via violations; optionally winsorize 5% when N is small.
Implementation path options
Fastest path (no schema change): implement compute + GET /proposal + POST /apply and UI overlays; keep audit via existing AuditLogger.
Audit‑ready path (recommended): add proposals table and versioned qc_limits, approval routes, and Inbox tab.
Acceptance criteria mapping
Auto-recalc from in-control runs only: Done via computeRollingProposal + exclusions.
L‑J overlays with Manufacturer/Observed/Cumulative and stats: Covered in UI plan.
Manual approval before apply: Covered (Option A approvals; Option B role-guarded apply).
Versioning/audit of changes: Fully in Option A; minimal audit via existing logger in Option B.
Docs/best practices: Captured from Westgard/CAP/CLSI and embedded in code comments and UI copy.
Would you like me to proceed with the audit‑ready path (proposals + versioned qc_limits) or the minimal path first, then iterate?