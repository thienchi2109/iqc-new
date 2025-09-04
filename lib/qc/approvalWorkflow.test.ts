import { WestgardEngine, type EvaluationResult } from './westgardEngine'

describe('WestgardEngine Approval Workflow', () => {
  const mockLimits = {
    mean: 100,
    sd: 5,
    cv: 5
  }

  const mockHistoricalData = [
    { id: '1', value: 95, z: -1, side: 'below' as const, createdAt: new Date(), levelId: '1' },
    { id: '2', value: 105, z: 1, side: 'above' as const, createdAt: new Date(), levelId: '1' },
    { id: '3', value: 98, z: -0.4, side: 'below' as const, createdAt: new Date(), levelId: '1' },
  ]

  beforeEach(() => {
    // Reset environment variable for each test
    delete process.env.USE_APPROVAL_GATE
  })

  describe('autoResult determination', () => {
    it('should set autoResult to "pass" for normal values with no violations', () => {
      const result = WestgardEngine.evaluateQcRun(102, mockLimits, mockHistoricalData)
      
      expect(result.autoResult).toBe('pass')
      expect(result.violations).toHaveLength(0)
    })

    it('should set autoResult to "warn" for 1-2s violations only', () => {
      const result = WestgardEngine.evaluateQcRun(111, mockLimits, mockHistoricalData) // z = 2.2
      
      expect(result.autoResult).toBe('warn')
      expect(result.violations.some(v => v.ruleCode === '1-2s' && v.severity === 'warn')).toBe(true)
      expect(result.violations.some(v => v.severity === 'fail')).toBe(false)
    })

    it('should set autoResult to "fail" for 1-3s violations', () => {
      const result = WestgardEngine.evaluateQcRun(120, mockLimits, mockHistoricalData) // z = 4
      
      expect(result.autoResult).toBe('fail')
      expect(result.violations.some(v => v.ruleCode === '1-3s' && v.severity === 'fail')).toBe(true)
    })

    it('should set autoResult to "fail" for any fail-severity violation', () => {
      // Create consecutive violations for 2-2s rule
      const consecutiveHistorical = [
        { id: '1', value: 110, z: 2, side: 'above' as const, createdAt: new Date(), levelId: '1' }, // Last point was +2SD
      ]
      
      const result = WestgardEngine.evaluateQcRun(111, mockLimits, consecutiveHistorical) // Another +2SD
      
      expect(result.autoResult).toBe('fail')
      expect(result.violations.some(v => v.ruleCode === '2-2s' && v.severity === 'fail')).toBe(true)
    })
  })

  describe('approval gate behavior', () => {
    it('should set status to "pending" when USE_APPROVAL_GATE is true (default)', () => {
      process.env.USE_APPROVAL_GATE = 'true'
      
      const result = WestgardEngine.evaluateQcRun(102, mockLimits, mockHistoricalData)
      
      expect(result.status).toBe('pending')
      expect(result.autoResult).toBe('pass')
    })

    it('should set status to "pending" when USE_APPROVAL_GATE is not set (defaults to true)', () => {
      // No environment variable set
      
      const result = WestgardEngine.evaluateQcRun(102, mockLimits, mockHistoricalData)
      
      expect(result.status).toBe('pending')
      expect(result.autoResult).toBe('pass')
    })

    it('should use legacy behavior when USE_APPROVAL_GATE is false', () => {
      process.env.USE_APPROVAL_GATE = 'false'
      
      // Test passing run
      const passResult = WestgardEngine.evaluateQcRun(102, mockLimits, mockHistoricalData)
      expect(passResult.status).toBe('accepted')
      expect(passResult.autoResult).toBe('pass')
      
      // Test warning run
      const warnResult = WestgardEngine.evaluateQcRun(111, mockLimits, mockHistoricalData) // z = 2.2
      expect(warnResult.status).toBe('pending')
      expect(warnResult.autoResult).toBe('warn')
      
      // Test failing run
      const failResult = WestgardEngine.evaluateQcRun(120, mockLimits, mockHistoricalData) // z = 4
      expect(failResult.status).toBe('rejected')
      expect(failResult.autoResult).toBe('fail')
    })
  })

  describe('across-level rules with approval workflow', () => {
    it('should set autoResult to "fail" for R-4s violations', () => {
      const peerRuns = {
        'level1': { z: 3, levelId: 'level1' },
        'level2': { z: -2, levelId: 'level2' }
      }
      
      const result = WestgardEngine.evaluateQcRun(102, mockLimits, mockHistoricalData, peerRuns)
      
      expect(result.autoResult).toBe('fail')
      expect(result.violations.some(v => v.ruleCode === 'R-4s')).toBe(true)
    })

    it('should maintain pending status with approval gate regardless of violations', () => {
      process.env.USE_APPROVAL_GATE = 'true'
      
      const peerRuns = {
        'level1': { z: 3, levelId: 'level1' },
        'level2': { z: -2, levelId: 'level2' }
      }
      
      const result = WestgardEngine.evaluateQcRun(102, mockLimits, mockHistoricalData, peerRuns)
      
      expect(result.status).toBe('pending') // Always pending with approval gate
      expect(result.autoResult).toBe('fail') // But autoResult reflects the violation
    })
  })

  describe('edge cases', () => {
    it('should handle mixed severity violations correctly', () => {
      // Create a scenario with both warn and fail violations
      const mixedHistorical = [
        { id: '1', value: 110, z: 2, side: 'above' as const, createdAt: new Date(), levelId: '1' },
      ]
      
      // This should trigger both 1-2s (warn) and 2-2s (fail)
      const result = WestgardEngine.evaluateQcRun(111, mockLimits, mixedHistorical)
      
      expect(result.autoResult).toBe('fail') // Fail takes precedence
      expect(result.violations.some(v => v.severity === 'warn')).toBe(true)
      expect(result.violations.some(v => v.severity === 'fail')).toBe(true)
    })

    it('should handle empty historical data gracefully', () => {
      const result = WestgardEngine.evaluateQcRun(102, mockLimits, [])
      
      expect(result.autoResult).toBe('pass')
      expect(result.violations).toHaveLength(0)
    })

    it('should handle zero standard deviation gracefully', () => {
      const zeroSDLimits = { ...mockLimits, sd: 0 }
      
      const result = WestgardEngine.evaluateQcRun(102, zeroSDLimits, mockHistoricalData)
      
      expect(result.z).toBe(0) // Should not cause division by zero
      expect(result.autoResult).toBe('pass')
    })
  })
})

// Integration test for the configurable evaluation method
describe('WestgardEngine.evaluateRun (configurable)', () => {
  const mockInput = {
    deviceId: 'device-1',
    testId: 'test-1',
    runAt: new Date(),
    value: 102,
    limits: { mean: 100, sd: 5, cv: 5 },
    historicalData: [
      { id: '1', value: 95, z: -1, side: 'below' as const, createdAt: new Date(), levelId: '1' },
    ]
  }

  // Note: This test would need proper mocking of the resolveProfile function
  // For now, we'll test the structure
  it('should return evaluation result with autoResult field', async () => {
    // Mock resolveProfile to return default config
    jest.mock('./resolveProfile', () => ({
      resolveProfile: jest.fn().mockResolvedValue({
        rules: {
          '1-3s': { enabled: true, severity: 'fail' },
          '1-2s': { enabled: true, severity: 'warn' },
          '2-2s': { enabled: true, severity: 'fail' },
        }
      })
    }))

    const result = await WestgardEngine.evaluateRun(mockInput)
    
    expect(result).toHaveProperty('autoResult')
    expect(result).toHaveProperty('status')
    expect(result).toHaveProperty('z')
    expect(result).toHaveProperty('side')
    expect(result).toHaveProperty('violations')
    expect(Array.isArray(result.violations)).toBe(true)
  })
})
