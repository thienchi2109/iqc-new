/**
 * Rolling-N QC Limits Computation Service
 * 
 * Implements auto-recalculation of mean/SD from the most recent N in-control QC runs.
 * Follows best practices from Westgard QC, CLSI C24, and CAP recommendations:
 * - Minimum N=20 in-control runs over ≥10 working days span
 * - Excludes out-of-control results (violations of Westgard rules)
 * - Only proposes updates; never auto-applies (requires manual approval)
 */

import { db } from '@/lib/db/client'
import { qcRuns, violations, tests, qcLevels, qcLots, devices, qcLimits } from '@/lib/db/schema'
import { and, eq, desc, notExists, sql, inArray } from 'drizzle-orm'

// Configuration parameters (based on theory document recommendations)
export const ROLLING_CONFIG = {
  N_DEFAULT: 20,
  N_MIN: 20,
  MIN_WORKING_DAYS_SPAN: 10,
  EXCLUDE_RULES_FOR_ESTIMATION: ['1-3s', '2-2s', 'R-4s', '4-1s', '10x', '1-2s'] as string[],
  STATUS_INCLUDED: ['accepted'] as ('accepted' | 'pending' | 'rejected')[],
} as const

export interface RollingProposalParams {
  testCode: string
  level: string
  lotCode: string
  deviceCode: string
  n?: number
}

export interface RollingProposalResult {
  eligible: boolean
  reasons: string[]
  group: {
    testCode: string
    level: string
    lotCode: string
    deviceCode: string
  }
  window?: {
    n: number
    from: Date
    to: Date
    span_days: number
  }
  stats?: {
    mean: number
    sd: number
    cv: number
  }
  excludedCount: number
  currentLimits?: {
    mean: number
    sd: number
    cv: number
    source: string
  }
}

/**
 * Compute Rolling-N proposal for a specific QC group
 * 
 * @param params - Group identification and rolling window size
 * @returns Proposal with eligibility, statistics, and exclusion details
 */
export async function computeRollingProposal(
  params: RollingProposalParams
): Promise<RollingProposalResult> {
  const { testCode, level, lotCode, deviceCode, n = ROLLING_CONFIG.N_DEFAULT } = params
  const reasons: string[] = []
  
  // Validate N parameter
  if (n < ROLLING_CONFIG.N_MIN) {
    reasons.push(`Rolling window N=${n} below minimum ${ROLLING_CONFIG.N_MIN}`)
    return {
      eligible: false,
      reasons,
      group: { testCode, level, lotCode, deviceCode },
      excludedCount: 0,
    }
  }

  try {
    // Step 1: Resolve group IDs
    const groupIds = await resolveGroupIds(testCode, level, lotCode, deviceCode)
    if (!groupIds) {
      reasons.push('Group not found (test/level/lot/device combination invalid)')
      return {
        eligible: false,
        reasons,
        group: { testCode, level, lotCode, deviceCode },
        excludedCount: 0,
      }
    }

    // Step 2: Get current limits for comparison
    const currentLimits = await getCurrentLimits(groupIds)

    // Step 3: Get rolling window data
    const windowData = await getRollingWindow(groupIds, n)
    
    if (windowData.runs.length === 0) {
      reasons.push('No eligible in-control runs found')
      return {
        eligible: false,
        reasons,
        group: { testCode, level, lotCode, deviceCode },
        excludedCount: windowData.excludedCount,
        currentLimits,
      }
    }

    if (windowData.runs.length < ROLLING_CONFIG.N_MIN) {
      reasons.push(`Only ${windowData.runs.length} eligible runs, need ≥${ROLLING_CONFIG.N_MIN}`)
      return {
        eligible: false,
        reasons,
        group: { testCode, level, lotCode, deviceCode },
        excludedCount: windowData.excludedCount,
        currentLimits,
      }
    }

    // Step 4: Check time span requirement
    const from = new Date(windowData.runs[windowData.runs.length - 1].createdAt!)
    const to = new Date(windowData.runs[0].createdAt!)
    const spanDays = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24))

    if (spanDays < ROLLING_CONFIG.MIN_WORKING_DAYS_SPAN) {
      reasons.push(`Time span ${spanDays} days < minimum ${ROLLING_CONFIG.MIN_WORKING_DAYS_SPAN} days`)
      return {
        eligible: false,
        reasons,
        group: { testCode, level, lotCode, deviceCode },
        window: { n: windowData.runs.length, from, to, span_days: spanDays },
        excludedCount: windowData.excludedCount,
        currentLimits,
      }
    }

    // Step 5: Compute statistics
    const values = windowData.runs.map(run => parseFloat(run.value))
    const stats = computeStatistics(values)

    return {
      eligible: true,
      reasons: [`Eligible: ${windowData.runs.length} in-control runs over ${spanDays} days`],
      group: { testCode, level, lotCode, deviceCode },
      window: { n: windowData.runs.length, from, to, span_days: spanDays },
      stats,
      excludedCount: windowData.excludedCount,
      currentLimits,
    }

  } catch (error) {
    console.error('Error computing rolling proposal:', error)
    reasons.push(`Computation error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    return {
      eligible: false,
      reasons,
      group: { testCode, level, lotCode, deviceCode },
      excludedCount: 0,
    }
  }
}

/**
 * Resolve test/level/lot/device codes to database IDs
 */
async function resolveGroupIds(testCode: string, level: string, lotCode: string, deviceCode: string) {
  const result = await db
    .select({
      testId: tests.id,
      levelId: qcLevels.id,
      lotId: qcLots.id,
      deviceId: devices.id,
    })
    .from(tests)
    .innerJoin(qcLevels, and(
      eq(qcLevels.testId, tests.id),
      sql`${qcLevels.level} = ${level}`
    ))
    .innerJoin(qcLots, and(
      eq(qcLots.levelId, qcLevels.id),
      eq(qcLots.lotCode, lotCode)
    ))
    .innerJoin(devices, eq(devices.code, deviceCode))
    .where(eq(tests.code, testCode))
    .limit(1)

  return result[0] || null
}

/**
 * Get current limits for comparison
 */
async function getCurrentLimits(groupIds: { testId: string; levelId: string; lotId: string; deviceId: string }) {
  const result = await db
    .select({
      mean: qcLimits.mean,
      sd: qcLimits.sd,
      cv: qcLimits.cv,
      source: qcLimits.source,
    })
    .from(qcLimits)
    .where(and(
      eq(qcLimits.testId, groupIds.testId),
      eq(qcLimits.levelId, groupIds.levelId),
      eq(qcLimits.lotId, groupIds.lotId),
      eq(qcLimits.deviceId, groupIds.deviceId),
      sql`${qcLimits.effectiveTo} IS NULL` // Current active version
    ))
    .limit(1)

  if (result[0]) {
    return {
      mean: parseFloat(result[0].mean),
      sd: parseFloat(result[0].sd),
      cv: parseFloat(result[0].cv),
      source: result[0].source,
    }
  }
  return undefined
}

/**
 * Get rolling window of in-control runs
 */
async function getRollingWindow(
  groupIds: { testId: string; levelId: string; lotId: string; deviceId: string },
  n: number
) {
  // First, get total count of runs for this group to calculate excluded count
  const totalRuns = await db
    .select({ count: sql<number>`count(*)` })
    .from(qcRuns)
    .where(and(
      eq(qcRuns.testId, groupIds.testId),
      eq(qcRuns.levelId, groupIds.levelId),
      eq(qcRuns.lotId, groupIds.lotId),
      eq(qcRuns.deviceId, groupIds.deviceId)
    ))

  // Get in-control runs (no violations and accepted status)
  const eligibleRuns = await db
    .select({
      id: qcRuns.id,
      value: qcRuns.value,
      createdAt: qcRuns.createdAt,
    })
    .from(qcRuns)
    .where(and(
      eq(qcRuns.testId, groupIds.testId),
      eq(qcRuns.levelId, groupIds.levelId),
      eq(qcRuns.lotId, groupIds.lotId),
      eq(qcRuns.deviceId, groupIds.deviceId),
      inArray(qcRuns.status, [...ROLLING_CONFIG.STATUS_INCLUDED]),
      // Exclude runs with violations in the exclusion list
      notExists(
        db
          .select()
          .from(violations)
          .where(and(
            eq(violations.runId, qcRuns.id),
            inArray(violations.ruleCode, [...ROLLING_CONFIG.EXCLUDE_RULES_FOR_ESTIMATION])
          ))
      )
    ))
    .orderBy(desc(qcRuns.createdAt))
    .limit(n)

  const excludedCount = (totalRuns[0]?.count || 0) - eligibleRuns.length

  return {
    runs: eligibleRuns,
    excludedCount,
  }
}

/**
 * Compute statistical measures (mean, SD, CV)
 */
function computeStatistics(values: number[]) {
  const n = values.length
  
  if (n === 0) {
    throw new Error('Cannot compute statistics for empty dataset')
  }

  // Mean
  const mean = values.reduce((sum, val) => sum + val, 0) / n

  // Standard deviation (sample)
  if (n === 1) {
    return { mean, sd: 0, cv: 0 }
  }

  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (n - 1)
  const sd = Math.sqrt(variance)

  // Coefficient of variation (CV = SD/Mean * 100)
  const cv = mean === 0 ? 0 : (sd / Math.abs(mean)) * 100

  return {
    mean: Number(mean.toFixed(4)),
    sd: Number(sd.toFixed(4)),
    cv: Number(cv.toFixed(2)),
  }
}

/**
 * Apply winsorization for small sample sizes (optional robustification)
 * Winsorizes at 5% level to reduce outlier influence when N < 40
 */
function winsorizeValues(values: number[], percentile: number = 0.05): number[] {
  if (values.length < 20) return values // Too small for winsorization
  
  const sorted = [...values].sort((a, b) => a - b)
  const n = sorted.length
  const lowerIdx = Math.floor(n * percentile)
  const upperIdx = Math.ceil(n * (1 - percentile)) - 1
  
  const lowerBound = sorted[lowerIdx]
  const upperBound = sorted[upperIdx]
  
  return values.map(val => 
    val < lowerBound ? lowerBound :
    val > upperBound ? upperBound :
    val
  )
}

/**
 * Check if proposal meets criteria for automatic suggestion
 * Based on statistical difference thresholds
 */
export function shouldSuggestProposal(
  current: { mean: number; sd: number; cv: number },
  proposed: { mean: number; sd: number; cv: number }
): { suggest: boolean; reasons: string[] } {
  const reasons: string[] = []
  
  // Difference thresholds (from theory document)
  const meanDiffPercent = Math.abs(proposed.mean - current.mean) / current.sd * 100
  const cvDiffPercent = Math.abs(proposed.cv - current.cv) / current.cv * 100
  
  if (meanDiffPercent > 10) {
    reasons.push(`Mean shift ${meanDiffPercent.toFixed(1)}% of SD (>10% threshold)`)
  }
  
  if (cvDiffPercent > 20) {
    reasons.push(`CV change ${cvDiffPercent.toFixed(1)}% (>20% threshold)`)
  }
  
  return {
    suggest: reasons.length > 0,
    reasons,
  }
}
