/**
 * TEST ENDPOINT: /api/test/rolling-computation
 * 
 * Manual test endpoint for Rolling-N computation engine
 * This endpoint helps verify the computation works correctly
 * Should be removed in production
 */

import { NextRequest, NextResponse } from 'next/server'
import { testRollingComputation } from '@/lib/qc/__tests__/rollingLimits.test'

export async function GET(request: NextRequest) {
  try {
    console.log('🚀 Starting Rolling-N computation test...')
    
    const result = await testRollingComputation()
    
    return NextResponse.json({
      success: true,
      message: 'Rolling-N computation test completed',
      data: result,
      timestamp: new Date().toISOString(),
    })
    
  } catch (error) {
    console.error('Test failed:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Rolling-N computation test failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }, { status: 500 })
  }
}
