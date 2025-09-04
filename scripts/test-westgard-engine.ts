import { WestgardEngine, type EvaluateRunInput, type QcRunData, type QcLimit } from '../lib/qc/westgardEngine'

async function testWestgardEngine() {
  console.log('Testing WestgardEngine with configurable rules...')
  
  // Test with actual device and test IDs from database
  const deviceId = 'a1f5c894-ceac-43af-9d1c-2c293d772058'
  const testId = '3fe37b45-d9b5-4563-bd5e-73c05032b8f0'
  
  // Mock QC limits
  const limits: QcLimit = {
    mean: 100,
    sd: 5,
    cv: 5.0
  }
  
  // Mock historical data (empty for this test)
  const historicalData: QcRunData[] = []
  
  try {
    console.log('\n=== Test 1: Normal value (should pass) ===')
    const normalInput: EvaluateRunInput = {
      deviceId,
      testId,
      runAt: new Date(),
      value: 102, // 0.4 SD above mean - should pass
      limits,
      historicalData
    }
    
    const normalResult = await WestgardEngine.evaluateRun(normalInput)
    console.log('Z-score:', normalResult.z)
    console.log('Status:', normalResult.status)
    console.log('Violations:', normalResult.violations.length)
    
    console.log('\n=== Test 2: 1-2s violation (should warn) ===')
    const warnInput: EvaluateRunInput = {
      deviceId,
      testId,
      runAt: new Date(),
      value: 111, // 2.2 SD above mean - should trigger 1-2s warn
      limits,
      historicalData
    }
    
    const warnResult = await WestgardEngine.evaluateRun(warnInput)
    console.log('Z-score:', warnResult.z)
    console.log('Status:', warnResult.status)
    console.log('Violations:', warnResult.violations.map(v => `${v.ruleCode} (${v.severity})`))
    
    console.log('\n=== Test 3: 1-3s violation (should fail) ===')
    const failInput: EvaluateRunInput = {
      deviceId,
      testId,
      runAt: new Date(),
      value: 116, // 3.2 SD above mean - should trigger 1-3s fail
      limits,
      historicalData
    }
    
    const failResult = await WestgardEngine.evaluateRun(failInput)
    console.log('Z-score:', failResult.z)
    console.log('Status:', failResult.status)
    console.log('Violations:', failResult.violations.map(v => `${v.ruleCode} (${v.severity})`))
    
    console.log('\n=== Test 4: Compare with legacy method ===')
    const legacyResult = WestgardEngine.evaluateQcRun(
      normalInput.value,
      normalInput.limits,
      normalInput.historicalData
    )
    console.log('Legacy Z-score:', legacyResult.z)
    console.log('Legacy Status:', legacyResult.status)
    console.log('Should match configurable result:', 
      normalResult.z === legacyResult.z && 
      normalResult.status === legacyResult.status
    )
    
  } catch (error) {
    console.error('Error testing WestgardEngine:', error)
  }
}

// Run test if this file is executed directly
if (require.main === module) {
  testWestgardEngine()
}
