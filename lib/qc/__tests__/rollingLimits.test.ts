/**
 * Test for Rolling-N QC Limits Computation
 * 
 * Simple manual test to verify the computation engine works correctly
 */

import { computeRollingProposal, ROLLING_CONFIG } from '../rollingLimits'

// This is a manual test function that can be called from the API endpoint
// In a real scenario, this would be part of the Jest test suite

export async function testRollingComputation() {
  console.log('🧪 Testing Rolling-N QC Limits Computation Engine...')
  
  try {
    // Test with a sample group
    const testParams = {
      testCode: 'GLU',
      level: 'L1' as const,
      lotCode: 'LOT001',
      deviceCode: 'DEV001',
      n: 20,
    }
    
    console.log('📋 Test Parameters:', testParams)
    console.log('⚙️  Configuration:', ROLLING_CONFIG)
    
    const result = await computeRollingProposal(testParams)
    
    console.log('\n📊 Rolling Proposal Result:')
    console.log('- Eligible:', result.eligible)
    console.log('- Reasons:', result.reasons)
    console.log('- Group:', result.group)
    
    if (result.window) {
      console.log('- Window:')
      console.log('  - N:', result.window.n)
      console.log('  - From:', result.window.from)
      console.log('  - To:', result.window.to)
      console.log('  - Span (days):', result.window.span_days)
    }
    
    if (result.stats) {
      console.log('- Statistics:')
      console.log('  - Mean:', result.stats.mean)
      console.log('  - SD:', result.stats.sd)
      console.log('  - CV%:', result.stats.cv)
    }
    
    if (result.currentLimits) {
      console.log('- Current Limits:')
      console.log('  - Mean:', result.currentLimits.mean)
      console.log('  - SD:', result.currentLimits.sd)
      console.log('  - CV%:', result.currentLimits.cv)
      console.log('  - Source:', result.currentLimits.source)
    }
    
    console.log('- Excluded Count:', result.excludedCount)
    
    console.log('\n✅ Test completed successfully!')
    return result
    
  } catch (error) {
    console.error('\n❌ Test failed with error:', error)
    throw error
  }
}

// Export for potential use in actual tests
export const mockRollingData = {
  validGroup: {
    testCode: 'GLU',
    level: 'L1' as const,
    lotCode: 'LOT001', 
    deviceCode: 'DEV001',
  },
  invalidGroup: {
    testCode: 'INVALID',
    level: 'L1' as const,
    lotCode: 'INVALID',
    deviceCode: 'INVALID',
  },
}

export default testRollingComputation
