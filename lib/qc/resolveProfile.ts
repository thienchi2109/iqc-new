import { db } from '@/lib/db/client'
import { ruleProfiles, ruleProfileBindings } from '@/lib/db/schema'
import { eq, and, or, lte, gte, isNull, desc, sql } from 'drizzle-orm'

/**
 * Configuration for individual Westgard rules
 */
export interface RuleConfig {
  enabled: boolean
  severity?: 'warn' | 'fail'
  threshold_sd?: number
  window?: number
  n?: number
  within_run_across_levels?: boolean
  across_runs?: boolean
  delta_sd?: number
}

/**
 * Complete rules configuration including global settings and individual rules
 */
export interface RulesConfig {
  window_size_default: number
  rules: Record<string, RuleConfig>
}

/**
 * Default MVP rule configuration that matches the original hard-coded engine behavior
 */
const DEFAULT_RULES: RulesConfig = {
  window_size_default: 12,
  rules: {
    '1-3s': { enabled: true, severity: 'fail' },
    '1-2s': { enabled: true, severity: 'warn' },
    '2-2s': { enabled: true, severity: 'fail' },
    'R-4s': { 
      enabled: true, 
      severity: 'fail',
      within_run_across_levels: true, 
      across_runs: true, 
      delta_sd: 4 
    },
    '4-1s': { enabled: true, severity: 'fail', threshold_sd: 1, window: 4 },
    '10x': { enabled: true, severity: 'fail', n: 10 },
    '7T': { enabled: true, severity: 'fail', n: 7 },
    '2of3-2s': { enabled: false, severity: 'fail', threshold_sd: 2, window: 3 },
    '3-1s': { enabled: false, severity: 'fail', threshold_sd: 1, window: 3 },
    '6x': { enabled: false, severity: 'fail', n: 6 }
  }
}

/**
 * Resolve the effective rule profile for a specific device, test, and time
 * 
 * Priority order:
 * 1. device_test (specific device + test combination)
 * 2. test (specific test, any device)
 * 3. device (specific device, any test)
 * 4. global (fallback for all)
 * 
 * @param deviceId UUID of the device
 * @param testId UUID of the test
 * @param at Date/time for which to resolve the profile (defaults to now)
 * @returns Promise<RulesConfig> The resolved rule configuration
 */
export async function resolveProfile({
  deviceId,
  testId,
  at = new Date()
}: {
  deviceId: string
  testId: string
  at?: Date
}): Promise<RulesConfig> {
  // Feature flag check - return default rules if profile config is disabled
  if (process.env.USE_PROFILE_CONFIG !== 'true') {
    return DEFAULT_RULES
  }

  try {
    // Query for active bindings in priority order
    const bindings = await db
      .select({
        enabledRules: ruleProfiles.enabledRules,
        scopeType: ruleProfileBindings.scopeType,
        activeFrom: ruleProfileBindings.activeFrom,
        testId: ruleProfileBindings.testId,
        deviceId: ruleProfileBindings.deviceId
      })
      .from(ruleProfileBindings)
      .innerJoin(ruleProfiles, eq(ruleProfiles.id, ruleProfileBindings.profileId))
      .where(
        and(
          // Match scope criteria
          or(
            // device_test: exact device + test match
            and(
              eq(ruleProfileBindings.scopeType, 'device_test'),
              eq(ruleProfileBindings.deviceId, deviceId),
              eq(ruleProfileBindings.testId, testId)
            ),
            // test: exact test match, any device
            and(
              eq(ruleProfileBindings.scopeType, 'test'),
              eq(ruleProfileBindings.testId, testId)
            ),
            // device: exact device match, any test
            and(
              eq(ruleProfileBindings.scopeType, 'device'),
              eq(ruleProfileBindings.deviceId, deviceId)
            ),
            // global: matches everything
            eq(ruleProfileBindings.scopeType, 'global')
          ),
          // Active time window check
          or(
            isNull(ruleProfileBindings.activeFrom),
            lte(ruleProfileBindings.activeFrom, at)
          ),
          or(
            isNull(ruleProfileBindings.activeTo),
            gte(ruleProfileBindings.activeTo, at)
          )
        )
      )
      .orderBy(
        // Priority order: device_test > test > device > global
        sql`CASE ${ruleProfileBindings.scopeType}
          WHEN 'device_test' THEN 1
          WHEN 'test' THEN 2
          WHEN 'device' THEN 3
          WHEN 'global' THEN 4
          ELSE 5
        END`,
        // Most recent activeFrom within same priority
        desc(ruleProfileBindings.activeFrom)
      )
      .limit(1)

    // Return the first (highest priority) match or default rules
    const binding = bindings[0]
    if (binding?.enabledRules) {
      // Validate and return the profile rules
      return validateRulesConfig(binding.enabledRules as any) || DEFAULT_RULES
    }

    return DEFAULT_RULES
  } catch (error) {
    // Log error but don't fail - return default rules as fallback
    console.error('Error resolving rule profile:', error)
    return DEFAULT_RULES
  }
}

/**
 * Validate that a rules config object has the expected structure
 * @param config Raw configuration object from database
 * @returns RulesConfig if valid, null if invalid
 */
function validateRulesConfig(config: any): RulesConfig | null {
  try {
    // Basic structure validation
    if (!config || typeof config !== 'object') return null
    if (typeof config.window_size_default !== 'number') return null
    if (!config.rules || typeof config.rules !== 'object') return null

    // Validate individual rules
    const validatedRules: Record<string, RuleConfig> = {}
    for (const [ruleCode, ruleConfig] of Object.entries(config.rules)) {
      if (!ruleConfig || typeof ruleConfig !== 'object') continue
      
      const rule = ruleConfig as any
      if (typeof rule.enabled !== 'boolean') continue

      validatedRules[ruleCode] = {
        enabled: rule.enabled,
        ...(rule.severity && { severity: rule.severity }),
        ...(typeof rule.threshold_sd === 'number' && { threshold_sd: rule.threshold_sd }),
        ...(typeof rule.window === 'number' && { window: rule.window }),
        ...(typeof rule.n === 'number' && { n: rule.n }),
        ...(typeof rule.within_run_across_levels === 'boolean' && { within_run_across_levels: rule.within_run_across_levels }),
        ...(typeof rule.across_runs === 'boolean' && { across_runs: rule.across_runs }),
        ...(typeof rule.delta_sd === 'number' && { delta_sd: rule.delta_sd })
      }
    }

    return {
      window_size_default: config.window_size_default,
      rules: validatedRules
    }
  } catch (error) {
    console.error('Error validating rules config:', error)
    return null
  }
}

/**
 * Get the default rules configuration (for testing or fallback)
 */
export function getDefaultRules(): RulesConfig {
  return DEFAULT_RULES
}

/**
 * Check if rule profile configuration is enabled
 */
export function isProfileConfigEnabled(): boolean {
  return process.env.USE_PROFILE_CONFIG === 'true'
}
