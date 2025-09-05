import { resolveProfile, type RulesConfig } from './resolveProfile'
import { type RuleConfigSchema, ruleRequiresMultipleLevels, ruleOperatesAcrossLevels, ruleOperatesWithinLevel } from './rules.schema'

export interface QcRunData {
  id: string
  value: number
  z: number
  side: 'above' | 'below' | 'on'
  createdAt: Date
  levelId: string
}

export interface QcLimit {
  mean: number
  sd: number
  cv: number
}

export interface Violation {
  ruleCode: string
  severity: 'warn' | 'fail'
  windowSize?: number
  details?: Record<string, any>
}

export interface EvaluationResult {
  z: number
  side: 'above' | 'below' | 'on'
  status: 'accepted' | 'rejected' | 'pending'
  autoResult: 'pass' | 'warn' | 'fail'
  violations: Violation[]
}

export interface EvaluateRunInput {
  deviceId: string
  testId: string
  runAt: Date
  value: number
  limits: QcLimit
  historicalData: QcRunData[]
  peerRuns?: Record<string, { z: number; levelId: string }>
}

export interface RuleEvaluationContext {
  currentZ: number
  historicalData: QcRunData[]
  peerRuns?: Record<string, { z: number; levelId: string }>
  currentLevelId: string
  availableLevels: string[]
  hasHistoricalSeries: boolean
  hasMultipleLevelsInGroup: boolean
}

export class WestgardEngine {
  /**
   * Calculate Z-score from value and limits
   */
  static calculateZScore(value: number, mean: number, sd: number): number {
    if (sd === 0) return 0
    return (value - mean) / sd
  }

  /**
   * Determine which side of mean the value falls on
   */
  static determineSide(z: number): 'above' | 'below' | 'on' {
    const threshold = 0.05 // Small threshold to account for floating point precision
    if (z > threshold) return 'above'
    if (z < -threshold) return 'below'
    return 'on'
  }

  /**
   * Check if two values are on the same side of mean
   */
  static sameSide(z1: number, z2: number): boolean {
    const side1 = WestgardEngine.determineSide(z1)
    const side2 = WestgardEngine.determineSide(z2)
    return side1 === side2 && (side1 === 'above' || side1 === 'below')
  }

  /**
   * Check for consecutive points on the same side
   */
  static consecutiveOneSide(zScores: number[], count: number): boolean {
    if (zScores.length < count) return false
    
    for (let i = 0; i <= zScores.length - count; i++) {
      const slice = zScores.slice(i, i + count)
      const sides = slice.map(z => WestgardEngine.determineSide(z))
      
      // Check if all are above mean
      if (sides.every(side => side === 'above')) return true
      
      // Check if all are below mean
      if (sides.every(side => side === 'below')) return true
    }
    
    return false
  }

  /**
   * Check for n consecutive points beyond same ±nSD
   */
  static nConsecutiveBeyondSD(zScores: number[], count: number, sdLevel: number): boolean {
    if (zScores.length < count) return false
    
    for (let i = 0; i <= zScores.length - count; i++) {
      const slice = zScores.slice(i, i + count)
      
      // Check consecutive points all above +sdLevel
      if (slice.every(z => z > sdLevel)) return true
      
      // Check consecutive points all below -sdLevel
      if (slice.every(z => z < -sdLevel)) return true
    }
    
    return false
  }

  /**
   * Check for trend (consecutive increasing or decreasing)
   */
  static hasTrend(zScores: number[], count: number): boolean {
    if (zScores.length < count) return false
    
    for (let i = 0; i <= zScores.length - count; i++) {
      const slice = zScores.slice(i, i + count)
      
      // Check increasing trend
      let isIncreasing = true
      let isDecreasing = true
      
      for (let j = 1; j < slice.length; j++) {
        if (slice[j] <= slice[j - 1]) isIncreasing = false
        if (slice[j] >= slice[j - 1]) isDecreasing = false
      }
      
      if (isIncreasing || isDecreasing) return true
    }
    
    return false
  }

  /**
   * Check if a rule is eligible for evaluation based on metadata and context
   */
  static isRuleEligible(
    ruleCode: string,
    ruleConfig: RuleConfigSchema, 
    context: RuleEvaluationContext
  ): boolean {
    // Check if rule is enabled
    if (!ruleConfig.enabled) {
      return false
    }

    // Check required levels
    const requiredLevels = parseInt(ruleConfig.required_levels || '1')
    if (requiredLevels > context.availableLevels.length) {
      return false
    }

    // Check scope feasibility
    const scope = ruleConfig.scope || 'within_level'
    
    if (scope === 'within_level') {
      // Within level rules: some rules like 1-3s, 1-2s work without historical data
      // Only require historical data for rules that need sequence analysis
      const needsSequence = ['2-2s', '4-1s', '3-1s', '10x', '6x', '7T', 'Nx_ext'].includes(ruleCode)
      return needsSequence ? context.hasHistoricalSeries : true
    }
    
    if (scope === 'across_levels') {
      // Across levels rules require at least 2 levels in current run group
      return context.hasMultipleLevelsInGroup
    }
    
    if (scope === 'either') {
      // Either scope requires at least one of the conditions
      return context.hasHistoricalSeries || context.hasMultipleLevelsInGroup
    }
    
    if (scope === 'across_levels_or_time') {
      // This scope can work with any data available
      return context.hasHistoricalSeries || context.hasMultipleLevelsInGroup
    }
    
    return true
  }

  /**
   * Build a mixed chronological sequence that merges results across levels and runs
   * Used for across_levels_or_time scope rules like Nx_ext
   */
  static buildMixedChronologicalSequence(
    currentZ: number,
    currentLevelId: string,
    historicalData: QcRunData[],
    peerRuns: Record<string, { z: number; levelId: string }> | undefined,
    windowSize: number
  ): Array<{ z: number; levelId: string; timestamp: Date }> {
    const sequence: Array<{ z: number; levelId: string; timestamp: Date }> = []
    
    // Add current run
    sequence.push({ 
      z: currentZ, 
      levelId: currentLevelId, 
      timestamp: new Date() 
    })
    
    // Add peer runs from same group (same timestamp)
    if (peerRuns) {
      Object.values(peerRuns).forEach(run => {
        sequence.push({
          z: run.z,
          levelId: run.levelId,
          timestamp: new Date() // Same timestamp as current
        })
      })
    }
    
    // Add historical data (different timestamps)
    historicalData.forEach(run => {
      sequence.push({
        z: run.z,
        levelId: run.levelId,
        timestamp: run.createdAt
      })
    })
    
    // Sort by timestamp (most recent first) and limit to window size
    return sequence
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, windowSize)
  }
  static createEvaluationContext(
    currentZ: number,
    currentLevelId: string,
    historicalData: QcRunData[],
    peerRuns?: Record<string, { z: number; levelId: string }>
  ): RuleEvaluationContext {
    const availableLevels = new Set<string>()
    
    // Add current level
    availableLevels.add(currentLevelId)
    
    // Add levels from peer runs in same group
    if (peerRuns) {
      Object.values(peerRuns).forEach(run => availableLevels.add(run.levelId))
    }
    
    // Add levels from historical data (for reference)
    historicalData.forEach(run => availableLevels.add(run.levelId))
    
    const totalCurrentLevels = 1 + (peerRuns ? Object.keys(peerRuns).length : 0)
    
    return {
      currentZ,
      historicalData,
      peerRuns,
      currentLevelId,
      availableLevels: Array.from(availableLevels),
      hasHistoricalSeries: historicalData.length > 0,
      hasMultipleLevelsInGroup: totalCurrentLevels > 1
    }
  }

  /**
   * Enhanced evaluation of within-level and mixed scope rules with eligibility guards
   */
  static evaluateRulesWithGuards(
    currentZ: number,
    currentLevelId: string,
    historicalData: QcRunData[],
    peerRuns: Record<string, { z: number; levelId: string }> | undefined,
    config: RulesConfig
  ): Violation[] {
    const violations: Violation[] = []
    const context = WestgardEngine.createEvaluationContext(
      currentZ, 
      currentLevelId, 
      historicalData, 
      peerRuns
    )
    const allZ = [currentZ, ...historicalData.map(run => run.z)]

    // Evaluate all rules with eligibility guards
    for (const [ruleCode, ruleConfig] of Object.entries(config.rules)) {
      if (!WestgardEngine.isRuleEligible(ruleCode, ruleConfig as RuleConfigSchema, context)) {
        continue
      }

      // Single point rules
      if (ruleCode === '1-3s') {
        if (Math.abs(currentZ) > 3) {
          violations.push({
            ruleCode: '1-3s',
            severity: ruleConfig.severity || 'fail',
            details: { z: currentZ, threshold: 3 }
          })
        }
      }
      
      if (ruleCode === '1-2s') {
        if (Math.abs(currentZ) > 2) {
          violations.push({
            ruleCode: '1-2s',
            severity: ruleConfig.severity || 'warn',
            details: { z: currentZ, threshold: 2 }
          })
        }
      }

      // Enhanced 2-2s rule with across-levels support
      if (ruleCode === '2-2s') {
        const threshold = ruleConfig.threshold_sd || 2
        
        // Within-level consecutive (original behavior)
        if (ruleOperatesWithinLevel(ruleConfig as RuleConfigSchema) && 
            ruleConfig.across_runs !== false) {
          if (WestgardEngine.nConsecutiveBeyondSD(allZ, 2, threshold)) {
            violations.push({
              ruleCode: '2-2s',
              severity: ruleConfig.severity || 'fail',
              windowSize: 2,
              details: { 
                type: 'within_level_across_runs',
                sequence: allZ.slice(0, 2),
                threshold 
              }
            })
          }
        }
        
        // Across-levels within same run group (NEW FEATURE)
        if (ruleConfig.within_run_across_levels && peerRuns && 
            Object.keys(peerRuns).length >= 1) {
          const allCurrentRuns = [{ z: currentZ, levelId: currentLevelId }, ...Object.values(peerRuns)]
          const beyondThreshold = allCurrentRuns.filter(run => Math.abs(run.z) > threshold)
          
          if (beyondThreshold.length >= 2) {
            // Check if they are on the same side
            const positiveSide = beyondThreshold.filter(run => run.z > threshold)
            const negativeSide = beyondThreshold.filter(run => run.z < -threshold)
            
            if (positiveSide.length >= 2 || negativeSide.length >= 2) {
              violations.push({
                ruleCode: '2-2s',
                severity: ruleConfig.severity || 'fail',
                details: {
                  type: 'across_levels_within_run',
                  levels: beyondThreshold.map(r => r.levelId),
                  zValues: beyondThreshold.map(r => r.z),
                  threshold,
                  side: positiveSide.length >= 2 ? 'positive' : 'negative'
                }
              })
            }
          }
        }
      }

      // Consecutive beyond SD rules
      if (['4-1s', '3-1s'].includes(ruleCode)) {
        const threshold = ruleConfig.threshold_sd || 1
        const window = ruleConfig.window || (ruleCode === '4-1s' ? 4 : 3)
        if (WestgardEngine.nConsecutiveBeyondSD(allZ, window, threshold)) {
          violations.push({
            ruleCode,
            severity: ruleConfig.severity || 'fail',
            windowSize: window,
            details: { sequence: allZ.slice(0, window), threshold }
          })
        }
      }

      // Consecutive same-side rules
      if (['10x', '6x', '8x', '12x'].includes(ruleCode)) {
        const count = ruleConfig.n || parseInt(ruleCode)
        if (WestgardEngine.consecutiveOneSide(allZ, count)) {
          violations.push({
            ruleCode,
            severity: ruleConfig.severity || 'fail',
            windowSize: count,
            details: { sequence: allZ.slice(0, count) }
          })
        }
      }

      // Trend rules
      if (ruleCode === '7T') {
        const count = ruleConfig.n || 7
        if (WestgardEngine.hasTrend(allZ, count)) {
          violations.push({
            ruleCode: '7T',
            severity: ruleConfig.severity || 'fail',
            windowSize: count,
            details: { sequence: allZ.slice(0, count) }
          })
        }
      }

      // Extended Nx rule with n_set support
      if (ruleCode === 'Nx_ext') {
        const nSet = ruleConfig.n_set || []
        const window = ruleConfig.window || 24
        
        for (const n of nSet) {
          let detected = false
          
          if (ruleConfig.scope === 'within_level') {
            // Within level: use historical series for current level only
            detected = WestgardEngine.consecutiveOneSide(allZ, n)
          } else if (ruleConfig.scope === 'across_levels_or_time') {
            // Mixed chronological sequence across levels and time
            const mixedSequence = WestgardEngine.buildMixedChronologicalSequence(
              currentZ, currentLevelId, historicalData, peerRuns, window
            )
            const mixedZ = mixedSequence.map(item => item.z)
            detected = WestgardEngine.consecutiveOneSide(mixedZ, n)
          }
          
          if (detected) {
            violations.push({
              ruleCode: `Nx_ext`,
              severity: ruleConfig.severity || 'fail',
              windowSize: n,
              details: { 
                n, 
                scope: ruleConfig.scope,
                sequence_type: ruleConfig.scope === 'within_level' ? 'single_level' : 'mixed_chronological'
              }
            })
            break // Only report first violation for efficiency
          }
        }
      }
    }

    return violations
  }

  /**
   * Enhanced across-level rules evaluation with eligibility guards
   */
  static evaluateAcrossLevelRulesWithGuards(
    currentZ: number,
    currentLevelId: string,
    peerRuns: Record<string, { z: number; levelId: string }>,
    config: RulesConfig
  ): Violation[] {
    const violations: Violation[] = []
    const runs = Object.values(peerRuns)
    const allCurrentRuns = [{ z: currentZ, levelId: currentLevelId }, ...runs]
    
    if (allCurrentRuns.length < 2) return violations

    // Create context for across-level rules
    const context = WestgardEngine.createEvaluationContext(
      currentZ, currentLevelId, [], peerRuns
    )

    // Evaluate across-level rules with guards
    for (const [ruleCode, ruleConfig] of Object.entries(config.rules)) {
      if (!ruleOperatesAcrossLevels(ruleConfig as RuleConfigSchema) ||
          !WestgardEngine.isRuleEligible(ruleCode, ruleConfig as RuleConfigSchema, context)) {
        continue
      }

      // R-4s rule: Range between levels exceeds configurable SD
      if (ruleCode === 'R-4s') {
        const threshold = ruleConfig.delta_sd || 4
        const zValues = allCurrentRuns.map(run => run.z)
        const range = Math.max(...zValues) - Math.min(...zValues)
        
        if (range > threshold) {
          violations.push({
            ruleCode: 'R-4s',
            severity: ruleConfig.severity || 'fail',
            details: { 
              range, 
              threshold,
              levels: allCurrentRuns.map(r => r.levelId),
              zValues 
            }
          })
        }
      }

      // 2of3-2s rule: Two of three levels beyond ±2SD
      if (ruleCode === '2of3-2s' && allCurrentRuns.length >= 3) {
        const threshold = ruleConfig.threshold_sd || 2
        const zValues = allCurrentRuns.map(run => run.z)
        const beyondThreshold = zValues.filter(z => Math.abs(z) > threshold).length
        if (beyondThreshold >= 2) {
          violations.push({
            ruleCode: '2of3-2s',
            severity: ruleConfig.severity || 'fail',
            details: {
              count: beyondThreshold,
              threshold,
              levels: allCurrentRuns.map(r => r.levelId),
              zValues
            }
          })
        }
      }
    }

    return violations
  }

  /**
   * Main configurable evaluation method with enhanced rules and guards
   */
  static async evaluateRun(input: EvaluateRunInput): Promise<EvaluationResult> {
    // Resolve rule configuration for this device/test combination
    const config = await resolveProfile({
      deviceId: input.deviceId,
      testId: input.testId,
      at: input.runAt
    })

    // Calculate Z-score and side
    const z = WestgardEngine.calculateZScore(input.value, input.limits.mean, input.limits.sd)
    const side = WestgardEngine.determineSide(z)

    // Get current level ID - we need to extract this from somewhere
    // For now, use a default or the first historical data level
    const currentLevelId = input.historicalData[0]?.levelId || 'L1'
    
    // Use enhanced evaluation with guards for current level  
    const withinLevelViolations = WestgardEngine.evaluateRulesWithGuards(
      z, 
      currentLevelId,
      input.historicalData,
      input.peerRuns,
      config
    )

    // Evaluate across-level rules if peer runs provided
    const acrossLevelViolations = input.peerRuns 
      ? WestgardEngine.evaluateAcrossLevelRulesWithGuards(z, currentLevelId, input.peerRuns, config)
      : []

    // Combine all violations
    const allViolations = [...withinLevelViolations, ...acrossLevelViolations]

    // Determine auto_result based on violations (for approval workflow)
    const hasFail = allViolations.some(v => v.severity === 'fail')
    const hasWarn = allViolations.some(v => v.severity === 'warn')
    
    let autoResult: 'pass' | 'warn' | 'fail'
    if (hasFail) {
      autoResult = 'fail'
    } else if (hasWarn) {
      autoResult = 'warn'
    } else {
      autoResult = 'pass'
    }

    // Determine legacy status (for backwards compatibility)
    // With approval workflow, this will be overridden by approval_state
    let status: 'accepted' | 'rejected' | 'pending'
    const useApprovalGate = process.env.USE_APPROVAL_GATE !== 'false'
    
    if (useApprovalGate) {
      // With approval gate, all runs start as pending regardless of auto_result
      status = 'pending'
    } else {
      // Legacy behavior: auto-approve/reject based on violations
      if (hasFail) {
        status = 'rejected'
      } else if (hasWarn) {
        status = 'pending' // Requires review
      } else {
        status = 'accepted'
      }
    }

    return {
      z,
      side,
      status,
      autoResult,
      violations: allViolations
    }
  }

  /**
   * Evaluate within-level Westgard rules for a single QC level (legacy method)
   */
  static evaluateWithinLevelRules(
    currentZ: number,
    historicalData: QcRunData[]
  ): Violation[] {
    const violations: Violation[] = []
    const allZ = [currentZ, ...historicalData.map(run => run.z)]

    // 1-3s rule: Single point beyond ±3SD (fail)
    if (Math.abs(currentZ) > 3) {
      violations.push({
        ruleCode: '1-3s',
        severity: 'fail',
        details: { z: currentZ, threshold: 3 }
      })
    }

    // 1-2s rule: Single point beyond ±2SD (warning)
    if (Math.abs(currentZ) > 2) {
      violations.push({
        ruleCode: '1-2s',
        severity: 'warn',
        details: { z: currentZ, threshold: 2 }
      })
    }

    // 2-2s rule: Two consecutive points beyond same ±2SD (fail)
    if (WestgardEngine.nConsecutiveBeyondSD(allZ, 2, 2)) {
      violations.push({
        ruleCode: '2-2s',
        severity: 'fail',
        windowSize: 2,
        details: { sequence: allZ.slice(0, 2) }
      })
    }

    // 4-1s rule: Four consecutive points beyond same ±1SD (fail)
    if (WestgardEngine.nConsecutiveBeyondSD(allZ, 4, 1)) {
      violations.push({
        ruleCode: '4-1s',
        severity: 'fail',
        windowSize: 4,
        details: { sequence: allZ.slice(0, 4) }
      })
    }

    // 10x rule: Ten consecutive points on same side of mean (fail)
    if (WestgardEngine.consecutiveOneSide(allZ, 10)) {
      violations.push({
        ruleCode: '10x',
        severity: 'fail',
        windowSize: 10,
        details: { sequence: allZ.slice(0, 10) }
      })
    }

    // 7T rule: Seven consecutive points with trend (fail)
    if (WestgardEngine.hasTrend(allZ, 7)) {
      violations.push({
        ruleCode: '7T',
        severity: 'fail',
        windowSize: 7,
        details: { sequence: allZ.slice(0, 7) }
      })
    }

    return violations
  }

  /**
   * Evaluate across-level rules for runs in the same group
   */
  static evaluateAcrossLevelRules(
    currentRunsByLevel: Record<string, { z: number; levelId: string }>
  ): Violation[] {
    const violations: Violation[] = []
    const runs = Object.values(currentRunsByLevel)
    
    if (runs.length < 2) return violations

    // R-4s rule: Range between levels exceeds 4SD (fail)
    const zValues = runs.map(run => run.z)
    const range = Math.max(...zValues) - Math.min(...zValues)
    
    if (range > 4) {
      violations.push({
        ruleCode: 'R-4s',
        severity: 'fail',
        details: { 
          range, 
          threshold: 4,
          levels: runs.map(r => r.levelId),
          zValues 
        }
      })
    }

    // 2of3-2s rule: Two of three levels beyond ±2SD (fail)
    if (runs.length >= 3) {
      const beyond2SD = zValues.filter(z => Math.abs(z) > 2).length
      if (beyond2SD >= 2) {
        violations.push({
          ruleCode: '2of3-2s',
          severity: 'fail',
          details: {
            count: beyond2SD,
            threshold: 2,
            levels: runs.map(r => r.levelId),
            zValues
          }
        })
      }
    }

    return violations
  }

  /**
   * Main evaluation method that combines all rules
   */
  static evaluateQcRun(
    value: number,
    limits: QcLimit,
    historicalData: QcRunData[],
    peerRuns?: Record<string, { z: number; levelId: string }>
  ): EvaluationResult {
    // Calculate Z-score and side
    const z = WestgardEngine.calculateZScore(value, limits.mean, limits.sd)
    const side = WestgardEngine.determineSide(z)

    // Evaluate within-level rules
    const withinLevelViolations = WestgardEngine.evaluateWithinLevelRules(z, historicalData)

    // Evaluate across-level rules if peer runs provided
    const acrossLevelViolations = peerRuns 
      ? WestgardEngine.evaluateAcrossLevelRules(peerRuns)
      : []

    // Combine all violations
    const allViolations = [...withinLevelViolations, ...acrossLevelViolations]

    // Determine auto_result and status based on violations
    const hasFail = allViolations.some(v => v.severity === 'fail')
    const hasWarn = allViolations.some(v => v.severity === 'warn')
    
    let autoResult: 'pass' | 'warn' | 'fail'
    if (hasFail) {
      autoResult = 'fail'
    } else if (hasWarn) {
      autoResult = 'warn'
    } else {
      autoResult = 'pass'
    }

    let status: 'accepted' | 'rejected' | 'pending'
    const useApprovalGate = process.env.USE_APPROVAL_GATE !== 'false'
    
    if (useApprovalGate) {
      // With approval gate, all runs start as pending regardless of auto_result
      status = 'pending'
    } else {
      // Legacy behavior: auto-approve/reject based on violations
      if (hasFail) {
        status = 'rejected'
      } else if (hasWarn) {
        status = 'pending' // Requires review
      } else {
        status = 'accepted'
      }
    }

    return {
      z,
      side,
      status,
      autoResult,
      violations: allViolations
    }
  }

  /**
   * Get rule configuration with defaults
   */
  static getDefaultRuleConfig() {
    return {
      enabled: [
        '1-3s',  // Single point beyond ±3SD (fail)
        '1-2s',  // Single point beyond ±2SD (warn)
        '2-2s',  // Two consecutive points beyond same ±2SD (fail)
        'R-4s',  // Range between levels exceeds 4SD (fail)
        '4-1s',  // Four consecutive points beyond same ±1SD (fail)
        '10x',   // Ten consecutive points on same side (fail)
        '7T',    // Seven consecutive points with trend (fail)
      ],
      optional: [
        '2of3-2s', // Two of three levels beyond ±2SD (fail)
        '3-1s',    // Three consecutive points beyond same ±1SD (fail)
        '6x',      // Six consecutive points on same side (fail)
        '8x',      // Eight consecutive points on same side (fail)
        '12x',     // Twelve consecutive points on same side (fail)
      ]
    }
  }
}