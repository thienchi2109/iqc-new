import { resolveProfile, type RulesConfig } from './resolveProfile'

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
   * Evaluate within-level Westgard rules with configurable rules
   */
  static evaluateWithinLevelRulesConfigurable(
    currentZ: number,
    historicalData: QcRunData[],
    config: RulesConfig
  ): Violation[] {
    const violations: Violation[] = []
    const allZ = [currentZ, ...historicalData.map(run => run.z)]

    // 1-3s rule: Single point beyond ±3SD
    const rule13s = config.rules['1-3s']
    if (rule13s?.enabled && Math.abs(currentZ) > 3) {
      violations.push({
        ruleCode: '1-3s',
        severity: rule13s.severity || 'fail',
        details: { z: currentZ, threshold: 3 }
      })
    }

    // 1-2s rule: Single point beyond ±2SD
    const rule12s = config.rules['1-2s']
    if (rule12s?.enabled && Math.abs(currentZ) > 2) {
      violations.push({
        ruleCode: '1-2s',
        severity: rule12s.severity || 'warn',
        details: { z: currentZ, threshold: 2 }
      })
    }

    // 2-2s rule: Two consecutive points beyond same ±2SD
    const rule22s = config.rules['2-2s']
    if (rule22s?.enabled && WestgardEngine.nConsecutiveBeyondSD(allZ, 2, 2)) {
      violations.push({
        ruleCode: '2-2s',
        severity: rule22s.severity || 'fail',
        windowSize: 2,
        details: { sequence: allZ.slice(0, 2) }
      })
    }

    // 4-1s rule: Four consecutive points beyond same ±1SD
    const rule41s = config.rules['4-1s']
    if (rule41s?.enabled) {
      const threshold = rule41s.threshold_sd || 1
      const window = rule41s.window || 4
      if (WestgardEngine.nConsecutiveBeyondSD(allZ, window, threshold)) {
        violations.push({
          ruleCode: '4-1s',
          severity: rule41s.severity || 'fail',
          windowSize: window,
          details: { sequence: allZ.slice(0, window), threshold }
        })
      }
    }

    // 3-1s rule: Three consecutive points beyond same ±1SD (optional)
    const rule31s = config.rules['3-1s']
    if (rule31s?.enabled) {
      const threshold = rule31s.threshold_sd || 1
      const window = rule31s.window || 3
      if (WestgardEngine.nConsecutiveBeyondSD(allZ, window, threshold)) {
        violations.push({
          ruleCode: '3-1s',
          severity: rule31s.severity || 'fail',
          windowSize: window,
          details: { sequence: allZ.slice(0, window), threshold }
        })
      }
    }

    // 10x rule: Ten consecutive points on same side of mean
    const rule10x = config.rules['10x']
    if (rule10x?.enabled) {
      const count = rule10x.n || 10
      if (WestgardEngine.consecutiveOneSide(allZ, count)) {
        violations.push({
          ruleCode: '10x',
          severity: rule10x.severity || 'fail',
          windowSize: count,
          details: { sequence: allZ.slice(0, count) }
        })
      }
    }

    // 6x rule: Six consecutive points on same side (optional)
    const rule6x = config.rules['6x']
    if (rule6x?.enabled) {
      const count = rule6x.n || 6
      if (WestgardEngine.consecutiveOneSide(allZ, count)) {
        violations.push({
          ruleCode: '6x',
          severity: rule6x.severity || 'fail',
          windowSize: count,
          details: { sequence: allZ.slice(0, count) }
        })
      }
    }

    // 7T rule: Seven consecutive points with trend
    const rule7T = config.rules['7T']
    if (rule7T?.enabled) {
      const count = rule7T.n || 7
      if (WestgardEngine.hasTrend(allZ, count)) {
        violations.push({
          ruleCode: '7T',
          severity: rule7T.severity || 'fail',
          windowSize: count,
          details: { sequence: allZ.slice(0, count) }
        })
      }
    }

    return violations
  }

  /**
   * Evaluate across-level rules with configurable rules
   */
  static evaluateAcrossLevelRulesConfigurable(
    currentRunsByLevel: Record<string, { z: number; levelId: string }>,
    config: RulesConfig
  ): Violation[] {
    const violations: Violation[] = []
    const runs = Object.values(currentRunsByLevel)
    
    if (runs.length < 2) return violations

    // R-4s rule: Range between levels exceeds configurable SD
    const ruleR4s = config.rules['R-4s']
    if (ruleR4s?.enabled) {
      const threshold = ruleR4s.delta_sd || 4
      const zValues = runs.map(run => run.z)
      const range = Math.max(...zValues) - Math.min(...zValues)
      
      if (range > threshold) {
        violations.push({
          ruleCode: 'R-4s',
          severity: ruleR4s.severity || 'fail',
          details: { 
            range, 
            threshold,
            levels: runs.map(r => r.levelId),
            zValues 
          }
        })
      }
    }

    // 2of3-2s rule: Two of three levels beyond ±2SD
    const rule2of3 = config.rules['2of3-2s']
    if (rule2of3?.enabled && runs.length >= 3) {
      const threshold = rule2of3.threshold_sd || 2
      const zValues = runs.map(run => run.z)
      const beyondThreshold = zValues.filter(z => Math.abs(z) > threshold).length
      if (beyondThreshold >= 2) {
        violations.push({
          ruleCode: '2of3-2s',
          severity: rule2of3.severity || 'fail',
          details: {
            count: beyondThreshold,
            threshold,
            levels: runs.map(r => r.levelId),
            zValues
          }
        })
      }
    }

    return violations
  }

  /**
   * Main configurable evaluation method
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

    // Evaluate within-level rules with configuration
    const withinLevelViolations = WestgardEngine.evaluateWithinLevelRulesConfigurable(
      z, 
      input.historicalData,
      config
    )

    // Evaluate across-level rules if peer runs provided
    const acrossLevelViolations = input.peerRuns 
      ? WestgardEngine.evaluateAcrossLevelRulesConfigurable(input.peerRuns, config)
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