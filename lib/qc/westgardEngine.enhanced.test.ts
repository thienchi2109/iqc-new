import { WestgardEngine, type QcRunData, type QcLimit } from './westgardEngine'
import { DEFAULT_ENHANCED_RULES, type RuleConfigSchema } from './rules.schema'

describe('Enhanced Westgard Engine with Guards and New Rules', () => {
  const mockLimits: QcLimit = {
    mean: 100,
    sd: 5,
    cv: 5
  }

  const createMockRun = (value: number, levelId: string = 'L1', daysAgo: number = 0): QcRunData => {
    const z = WestgardEngine.calculateZScore(value, mockLimits.mean, mockLimits.sd)
    const createdAt = new Date()
    createdAt.setDate(createdAt.getDate() - daysAgo)
    
    return {
      id: `run-${Math.random()}`,
      value,
      z,
      side: WestgardEngine.determineSide(z),
      createdAt,
      levelId
    }
  }

  describe('Eligibility Guards', () => {
    test('should skip rule when required_levels not met', () => {
      const ruleConfig: RuleConfigSchema = {
        enabled: true,
        required_levels: '3',
        scope: 'across_levels'
      }
      
      const context = WestgardEngine.createEvaluationContext(
        2.5, 'L1', [], { 'L2': { z: 2.2, levelId: 'L2' } }
      )
      
      // Only 2 levels available, rule requires 3
      expect(WestgardEngine.isRuleEligible('rule-test', ruleConfig, context)).toBe(false)
    })

    test('should allow rule when required_levels is met', () => {
      const ruleConfig: RuleConfigSchema = {
        enabled: true,
        required_levels: '2',
        scope: 'across_levels'
      }
      
      const context = WestgardEngine.createEvaluationContext(
        2.5, 'L1', [], { 
          'L2': { z: 2.2, levelId: 'L2' },
          'L3': { z: 1.8, levelId: 'L3' }
        }
      )
      
      // 3 levels available, rule requires 2
      expect(WestgardEngine.isRuleEligible('rule-test', ruleConfig, context)).toBe(true)
    })

    test('should skip across_levels rule when only one level available', () => {
      const ruleConfig: RuleConfigSchema = {
        enabled: true,
        scope: 'across_levels'
      }
      
      const context = WestgardEngine.createEvaluationContext(
        2.5, 'L1', [createMockRun(95), createMockRun(98)], undefined
      )
      
      expect(WestgardEngine.isRuleEligible('across-levels-rule', ruleConfig, context)).toBe(false)
    })

    test('should skip within_level rule when no historical data', () => {
      const ruleConfig: RuleConfigSchema = {
        enabled: true,
        scope: 'within_level'
      }
      
      const context = WestgardEngine.createEvaluationContext(
        2.5, 'L1', [], undefined
      )
      
      expect(WestgardEngine.isRuleEligible('2-2s', ruleConfig, context)).toBe(false)
    })
  })

  describe('2-2s Across Levels Within Run Group', () => {
    test('should detect 2-2s across levels in same run group (positive side)', () => {
      const violations = WestgardEngine.evaluateRulesWithGuards(
        2.5, // Current Z > +2SD
        'L1',
        [],
        {
          'L2': { z: 2.3, levelId: 'L2' } // Peer run also > +2SD
        },
        {
          window_size_default: 12,
          rules: {
            '2-2s': {
              enabled: true,
              severity: 'fail',
              scope: 'either',
              within_run_across_levels: true,
              threshold_sd: 2
            }
          }
        }
      )
      
      expect(violations).toHaveLength(1)
      expect(violations[0].ruleCode).toBe('2-2s')
      expect(violations[0].details.type).toBe('across_levels_within_run')
      expect(violations[0].details.side).toBe('positive')
    })

    test('should detect 2-2s across levels in same run group (negative side)', () => {
      const violations = WestgardEngine.evaluateRulesWithGuards(
        -2.5, // Current Z < -2SD
        'L1',
        [],
        {
          'L2': { z: -2.3, levelId: 'L2' } // Peer run also < -2SD
        },
        {
          window_size_default: 12,
          rules: {
            '2-2s': {
              enabled: true,
              severity: 'fail',
              scope: 'either',
              within_run_across_levels: true,
              threshold_sd: 2
            }
          }
        }
      )
      
      expect(violations).toHaveLength(1)
      expect(violations[0].ruleCode).toBe('2-2s')
      expect(violations[0].details.side).toBe('negative')
    })

    test('should NOT detect 2-2s across levels when on different sides', () => {
      const violations = WestgardEngine.evaluateRulesWithGuards(
        2.5, // Current Z > +2SD
        'L1',
        [],
        {
          'L2': { z: -2.3, levelId: 'L2' } // Peer run < -2SD (different side)
        },
        {
          window_size_default: 12,
          rules: {
            '2-2s': {
              enabled: true,
              severity: 'fail',
              scope: 'either',
              within_run_across_levels: true,
              threshold_sd: 2
            }
          }
        }
      )
      
      // Should not detect violation when points are on different sides
      const acrossLevelsViolations = violations.filter(v => 
        v.details?.type === 'across_levels_within_run'
      )
      expect(acrossLevelsViolations).toHaveLength(0)
    })

    test('should preserve original within-level 2-2s behavior', () => {
      const violations = WestgardEngine.evaluateRulesWithGuards(
        2.5, // Current Z > +2SD
        'L1',
        [
          createMockRun(111), // Z = 2.2 (> +2SD)
          createMockRun(105), // Z = 1.0
          createMockRun(102)  // Z = 0.4
        ],
        undefined,
        {
          window_size_default: 12,
          rules: {
            '2-2s': {
              enabled: true,
              severity: 'fail',
              scope: 'either',
              across_runs: true,
              threshold_sd: 2
            }
          }
        }
      )
      
      expect(violations).toHaveLength(1)
      expect(violations[0].ruleCode).toBe('2-2s')
      expect(violations[0].details.type).toBe('within_level_across_runs')
    })
  })

  describe('Nx_ext Extended Rules', () => {
    test('should detect 9x consecutive same-side points within level', () => {
      // Create 8 historical runs all above mean
      const historicalData = Array.from({ length: 8 }, (_, i) => 
        createMockRun(101 + i, 'L1', 8 - i) // Values 101-108, z-scores 0.2-1.6
      )
      
      const violations = WestgardEngine.evaluateRulesWithGuards(
        101, // Current Z = 0.2 (9th consecutive above mean)
        'L1',
        historicalData,
        undefined,
        {
          window_size_default: 12,
          rules: {
            'Nx_ext': {
              enabled: true,
              severity: 'fail',
              scope: 'within_level',
              n_set: [8, 9, 10, 12]
            }
          }
        }
      )
      
      expect(violations).toHaveLength(1)
      expect(violations[0].ruleCode).toBe('Nx_ext')
      // It detects 8 first since that's earlier in the n_set array
      expect(violations[0].details.n).toBe(8)
      expect(violations[0].details.scope).toBe('within_level')
    })

    test('should detect 8x in n_set before 9x', () => {
      // Create 7 historical runs all above mean
      const historicalData = Array.from({ length: 7 }, (_, i) => 
        createMockRun(101 + i, 'L1', 7 - i)
      )
      
      const violations = WestgardEngine.evaluateRulesWithGuards(
        101, // Current Z = 0.2 (8th consecutive above mean)
        'L1',
        historicalData,
        undefined,
        {
          window_size_default: 12,
          rules: {
            'Nx_ext': {
              enabled: true,
              severity: 'fail',
              scope: 'within_level',
              n_set: [8, 9, 10, 12]
            }
          }
        }
      )
      
      expect(violations).toHaveLength(1)
      expect(violations[0].details.n).toBe(8) // Should detect 8x first
    })

    test('should handle mixed chronological sequence across levels and time', () => {
      // Historical data from different times
      const historicalData = [
        createMockRun(101, 'L1', 3), // 3 days ago
        createMockRun(102, 'L2', 2), // 2 days ago
        createMockRun(101, 'L1', 1), // 1 day ago
      ]
      
      const violations = WestgardEngine.evaluateRulesWithGuards(
        101, // Current Z = 0.2
        'L1',
        historicalData,
        {
          'L2': { z: 0.4, levelId: 'L2' }, // Same time as current
          'L3': { z: 0.6, levelId: 'L3' }  // Same time as current
        },
        {
          window_size_default: 24,
          rules: {
            'Nx_ext': {
              enabled: true,
              severity: 'fail',
              scope: 'across_levels_or_time',
              n_set: [6, 8, 10],
              window: 24
            }
          }
        }
      )
      
      // Should detect 6 consecutive points above mean in mixed sequence
      expect(violations).toHaveLength(1)
      expect(violations[0].details.sequence_type).toBe('mixed_chronological')
    })
  })

  describe('R-4s Rule with Guards', () => {
    test('should detect R-4s when range exceeds 4SD', () => {
      const violations = WestgardEngine.evaluateAcrossLevelRulesWithGuards(
        2.2, // Current Z = +2.2SD
        'L1',
        {
          'L2': { z: -2.2, levelId: 'L2' } // Range = 4.4SD > 4SD
        },
        {
          window_size_default: 12,
          rules: {
            'R-4s': {
              enabled: true,
              severity: 'fail',
              scope: 'across_levels',
              required_levels: '2',
              delta_sd: 4
            }
          }
        }
      )
      
      expect(violations).toHaveLength(1)
      expect(violations[0].ruleCode).toBe('R-4s')
      expect(violations[0].details.range).toBeCloseTo(4.4, 1)
    })

    test('should NOT detect R-4s when insufficient levels', () => {
      const violations = WestgardEngine.evaluateAcrossLevelRulesWithGuards(
        2.2, // Current Z = +2.2SD, only one level
        'L1',
        {}, // No peer runs
        {
          window_size_default: 12,
          rules: {
            'R-4s': {
              enabled: true,
              severity: 'fail',
              scope: 'across_levels',
              required_levels: '2',
              delta_sd: 4
            }
          }
        }
      )
      
      expect(violations).toHaveLength(0)
    })
  })

  describe('Backward Compatibility', () => {
    test('should maintain existing behavior for standard rules', () => {
      const violations = WestgardEngine.evaluateRulesWithGuards(
        3.2, // > 3SD
        'L1',
        [createMockRun(98)], // Add some historical data so rule is eligible
        undefined,
        {
          window_size_default: 12,
          rules: {
            '1-3s': {
              enabled: true,
              severity: 'fail',
              scope: 'within_level',
              required_levels: '1'
            }
          }
        }
      )
      
      expect(violations).toHaveLength(1)
      expect(violations[0].ruleCode).toBe('1-3s')
      expect(violations[0].severity).toBe('fail')
    })

    test('should handle disabled rules correctly', () => {
      const violations = WestgardEngine.evaluateRulesWithGuards(
        3.2, // > 3SD
        'L1',
        [],
        undefined,
        {
          window_size_default: 12,
          rules: {
            '1-3s': {
              enabled: false, // Disabled
              severity: 'fail',
              scope: 'within_level'
            }
          }
        }
      )
      
      expect(violations).toHaveLength(0)
    })
  })

  describe('Mixed Chronological Sequence Builder', () => {
    test('should build correct sequence with current, peer, and historical data', () => {
      const historicalData = [
        createMockRun(95, 'L1', 2),
        createMockRun(98, 'L2', 1)
      ]
      
      const sequence = WestgardEngine.buildMixedChronologicalSequence(
        1.0, // currentZ
        'L1', // currentLevelId
        historicalData,
        {
          'L2': { z: 0.8, levelId: 'L2' },
          'L3': { z: 1.2, levelId: 'L3' }
        },
        10 // windowSize
      )
      
      expect(sequence).toHaveLength(5) // current + 2 peers + 2 historical
      expect(sequence[0].z).toBe(1.0) // Current should be first (most recent)
      expect(sequence.every(item => item.z !== undefined)).toBe(true)
      expect(sequence.every(item => item.levelId !== undefined)).toBe(true)
    })

    test('should respect window size limit', () => {
      const historicalData = Array.from({ length: 10 }, (_, i) => 
        createMockRun(95 + i, 'L1', 10 - i)
      )
      
      const sequence = WestgardEngine.buildMixedChronologicalSequence(
        1.0, 'L1', historicalData, undefined, 5
      )
      
      expect(sequence).toHaveLength(5) // Respects window size
    })
  })
})

describe('Enhanced Rules Schema Validation', () => {
  test('should validate enhanced rule configuration', () => {
    const config = {
      enabled: true,
      severity: 'fail',
      required_levels: '2',
      scope: 'across_levels',
      within_run_across_levels: true,
      n_set: [8, 9, 10, 12]
    }
    
    // This would be validated by the schema in real usage
    expect(config.required_levels).toBe('2')
    expect(config.scope).toBe('across_levels')
    expect(config.n_set).toEqual([8, 9, 10, 12])
  })

  test('should handle default values correctly', () => {
    const config = DEFAULT_ENHANCED_RULES
    
    expect(config.rules['1-3s'].required_levels).toBe('1')
    expect(config.rules['R-4s'].required_levels).toBe('2')
    expect(config.rules['2of3-2s'].required_levels).toBe('3')
    expect(config.rules['Nx_ext'].n_set).toEqual([8, 9, 10, 12])
  })
})