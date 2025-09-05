import { z } from 'zod'

/**
 * Schema for individual Westgard rule configuration with enhanced metadata
 */
export const ruleConfigSchema = z.object({
  enabled: z.boolean(),
  severity: z.enum(['warn', 'fail']).optional().default('fail'),
  
  // Level requirements and scope metadata
  required_levels: z.enum(['1', '2', '3']).optional().default('1'),
  scope: z.enum(['within_level', 'across_levels', 'either', 'across_levels_or_time']).optional().default('within_level'),
  
  // Cross-level and cross-run behavior
  within_run_across_levels: z.boolean().optional().default(false),
  across_runs: z.boolean().optional().default(true),
  
  // Rule-specific parameters
  n: z.number().positive().optional(),
  n_set: z.array(z.number().positive()).optional(),
  delta_sd: z.number().positive().optional(),
  threshold_sd: z.number().positive().optional(),
  window: z.number().positive().optional(),
})

/**
 * Schema for complete rules configuration
 */
export const rulesConfigSchema = z.object({
  window_size_default: z.number().positive().default(12),
  rules: z.record(z.string(), ruleConfigSchema)
})

/**
 * Type exports for TypeScript usage
 */
export type RuleConfigSchema = z.infer<typeof ruleConfigSchema>
export type RulesConfigSchema = z.infer<typeof rulesConfigSchema>

/**
 * Default rule configuration with enhanced metadata
 */
export const DEFAULT_ENHANCED_RULES: RulesConfigSchema = {
  window_size_default: 12,
  rules: {
    // Single point rules
    '1-3s': { 
      enabled: true, 
      severity: 'fail',
      required_levels: '1',
      scope: 'within_level'
    },
    '1-2s': { 
      enabled: true, 
      severity: 'warn',
      required_levels: '1',
      scope: 'within_level'
    },
    
    // Consecutive point rules
    '2-2s': { 
      enabled: true, 
      severity: 'fail',
      required_levels: '1',
      scope: 'either',
      within_run_across_levels: true,
      across_runs: true,
      threshold_sd: 2,
      window: 2
    },
    '4-1s': { 
      enabled: true, 
      severity: 'fail',
      required_levels: '1',
      scope: 'within_level',
      threshold_sd: 1, 
      window: 4 
    },
    '3-1s': { 
      enabled: false, 
      severity: 'fail',
      required_levels: '1',
      scope: 'within_level',
      threshold_sd: 1, 
      window: 3 
    },
    
    // Range rules (across levels)
    'R-4s': { 
      enabled: true, 
      severity: 'fail',
      required_levels: '2',
      scope: 'across_levels',
      within_run_across_levels: true, 
      across_runs: true, 
      delta_sd: 4 
    },
    
    // Consecutive same-side rules
    '10x': { 
      enabled: true, 
      severity: 'fail',
      required_levels: '1',
      scope: 'within_level',
      n: 10 
    },
    '6x': { 
      enabled: false, 
      severity: 'fail',
      required_levels: '1',
      scope: 'within_level',
      n: 6 
    },
    
    // Extended Nx rules with n_set support
    'Nx_ext': {
      enabled: true,
      severity: 'fail',
      required_levels: '1',
      scope: 'across_levels_or_time',
      n_set: [8, 9, 10, 12],
      window: 24 // Extended window for mixed chronological sequence
    },
    
    // Trend rules
    '7T': { 
      enabled: true, 
      severity: 'fail',
      required_levels: '1',
      scope: 'within_level',
      n: 7 
    },
    
    // Multi-level rules
    '2of3-2s': { 
      enabled: false, 
      severity: 'fail',
      required_levels: '3',
      scope: 'across_levels',
      threshold_sd: 2, 
      window: 3 
    }
  }
}

/**
 * Validation function for rule configuration
 */
export function validateRuleConfig(config: unknown): RuleConfigSchema | null {
  try {
    return ruleConfigSchema.parse(config)
  } catch (error) {
    console.error('Rule config validation error:', error)
    return null
  }
}

/**
 * Validation function for complete rules configuration
 */
export function validateRulesConfig(config: unknown): RulesConfigSchema | null {
  try {
    return rulesConfigSchema.parse(config)
  } catch (error) {
    console.error('Rules config validation error:', error)
    return null
  }
}

/**
 * Helper function to check if a rule requires multiple levels
 */
export function ruleRequiresMultipleLevels(ruleConfig: RuleConfigSchema): boolean {
  return ruleConfig.required_levels === '2' || ruleConfig.required_levels === '3'
}

/**
 * Helper function to check if a rule operates across levels
 */
export function ruleOperatesAcrossLevels(ruleConfig: RuleConfigSchema): boolean {
  return ruleConfig.scope === 'across_levels' || 
         ruleConfig.scope === 'either' || 
         ruleConfig.scope === 'across_levels_or_time'
}

/**
 * Helper function to check if a rule operates within levels
 */
export function ruleOperatesWithinLevel(ruleConfig: RuleConfigSchema): boolean {
  return ruleConfig.scope === 'within_level' || 
         ruleConfig.scope === 'either' || 
         ruleConfig.scope === 'across_levels_or_time'
}