import { resolveProfile, isProfileConfigEnabled } from '../lib/qc/resolveProfile'

async function testResolveProfile() {
  console.log('Testing resolveProfile function...')
  console.log('Profile config enabled:', isProfileConfigEnabled())
  
  // Test with actual device and test IDs
  const deviceId = 'a1f5c894-ceac-43af-9d1c-2c293d772058'
  const testId = '3fe37b45-d9b5-4563-bd5e-73c05032b8f0'
  
  try {
    const config = await resolveProfile({ deviceId, testId })
    
    console.log('Resolved configuration:')
    console.log('- Window size default:', config.window_size_default)
    console.log('- Available rules:', Object.keys(config.rules))
    console.log('- Enabled rules:', Object.entries(config.rules)
      .filter(([_, rule]) => rule.enabled)
      .map(([code, rule]) => `${code} (${rule.severity || 'default'})`)
    )
    console.log('- Disabled rules:', Object.entries(config.rules)
      .filter(([_, rule]) => !rule.enabled)
      .map(([code, _]) => code)
    )
    
    // Test specific rule configs
    console.log('\nRule details:')
    console.log('- 1-3s:', config.rules['1-3s'])
    console.log('- R-4s:', config.rules['R-4s'])
    console.log('- 2of3-2s:', config.rules['2of3-2s'])
    
  } catch (error) {
    console.error('Error testing resolveProfile:', error)
  }
}

// Run test if this file is executed directly
if (require.main === module) {
  testResolveProfile()
}
