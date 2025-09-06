import { WestgardEngine } from '../westgardEngine'

describe('WestgardEngine - QC Runs', () => {
  const qcLimits = {
    mean: 100,
    sd: 5,
    cv: 2.5
  }

  const historicalData = [
    {
      id: '1',
      value: 100,
      z: 0,
      side: 'on' as const,
      createdAt: new Date('2023-01-01'),
      levelId: 'level-1'
    },
    {
      id: '2',
      value: 102,
      z: 0.4,
      side: 'above' as const,
      createdAt: new Date('2023-01-02'),
      levelId: 'level-1'
    },
    {
      id: '3',
      value: 98,
      z: -0.4,
      side: 'below' as const,
      createdAt: new Date('2023-01-03'),
      levelId: 'level-1'
    }
  ]

  describe('computeZ', () => {
    it('calculates correct z-score', () => {
      expect(WestgardEngine.computeZ(105, 100, 5)).toBe(1)
      expect(WestgardEngine.computeZ(95, 100, 5)).toBe(-1)
      expect(WestgardEngine.computeZ(100, 100, 5)).toBe(0)
    })

    it('handles edge cases', () => {
      expect(WestgardEngine.computeZ(100, 100, 0)).toBeNull()
      expect(WestgardEngine.computeZ(100, 100, -1)).toBeNull()
      expect(WestgardEngine.computeZ(NaN, 100, 5)).toBeNull()
      expect(WestgardEngine.computeZ(100, NaN, 5)).toBeNull()
      expect(WestgardEngine.computeZ(100, 100, NaN)).toBeNull()
    })
  })

  describe('evaluateQcRun', () => {
    it('evaluates 1-2s rule violation', () => {
      const result = WestgardEngine.evaluateQcRun(111, qcLimits, historicalData)
      expect(result.status).toBe('warning')
      expect(result.autoResult).toBe('violated')
      expect(result.violations.some(v => v.ruleCode === '1-2s')).toBe(true)
    })

    it('evaluates 1-3s rule violation', () => {
      const result = WestgardEngine.evaluateQcRun(116, qcLimits, historicalData)
      expect(result.status).toBe('rejected')
      expect(result.autoResult).toBe('violated')
      expect(result.violations.some(v => v.ruleCode === '1-3s')).toBe(true)
    })

    it('evaluates acceptable result', () => {
      const result = WestgardEngine.evaluateQcRun(101, qcLimits, historicalData)
      expect(result.status).toBe('accepted')
      expect(result.autoResult).toBe('accepted')
      expect(result.violations).toHaveLength(0)
    })

    it('evaluates R-4s rule with peer runs', () => {
      const peerRuns = {
        'level-1': { z: 2.5, levelId: 'level-1' }, // This level: Z = 2.5
        'level-2': { z: -2.5, levelId: 'level-2' }  // Peer level: Z = -2.5
      }
      
      // Range = 2.5 - (-2.5) = 5.0 >= 4, so R-4s violation
      const result = WestgardEngine.evaluateQcRun(112.5, qcLimits, historicalData, peerRuns)
      expect(result.violations.some(v => v.ruleCode === 'R-4s')).toBe(true)
    })

    it('evaluates 2of3-2s rule', () => {
      // Create historical data with two recent values beyond 2SD
      const dataWith2of3 = [
        ...historicalData,
        {
          id: '4',
          value: 111, // Z = 2.2
          z: 2.2,
          side: 'above' as const,
          createdAt: new Date('2023-01-04'),
          levelId: 'level-1'
        },
        {
          id: '5',
          value: 112, // Z = 2.4
          z: 2.4,
          side: 'above' as const,
          createdAt: new Date('2023-01-05'),
          levelId: 'level-1'
        }
      ]
      
      const result = WestgardEngine.evaluateQcRun(111, qcLimits, dataWith2of3)
      expect(result.violations.some(v => v.ruleCode === '2of3-2s')).toBe(true)
    })
  })

  describe('getSideForZ', () => {
    it('determines correct side', () => {
      expect(WestgardEngine.getSideForZ(0.5)).toBe('above')
      expect(WestgardEngine.getSideForZ(-0.5)).toBe('below')
      expect(WestgardEngine.getSideForZ(0.05)).toBe('on') // Within tolerance
      expect(WestgardEngine.getSideForZ(-0.05)).toBe('on') // Within tolerance
    })
  })

  describe('getColorForZ', () => {
    it('returns correct colors for different Z-scores', () => {
      expect(WestgardEngine.getColorForZ(0.5)).toBe('#16a34a') // green - acceptable
      expect(WestgardEngine.getColorForZ(1.5)).toBe('#d97706') // amber - caution
      expect(WestgardEngine.getColorForZ(2.5)).toBe('#ea580c') // orange - warn
      expect(WestgardEngine.getColorForZ(3.5)).toBe('#dc2626') // red - fail
    })
  })
})