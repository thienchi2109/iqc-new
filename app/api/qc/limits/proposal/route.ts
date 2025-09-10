/**
 * GET /api/qc/limits/proposal
 * 
 * Compute Rolling-N QC limits proposal for a specific group
 * Query parameters:
 * - testCode: Test code (required)
 * - level: QC level (L1|L2|L3) (required)
 * - lotCode: Lot code (required)
 * - deviceCode: Device code (required)
 * - n: Rolling window size (optional, defaults to 20)
 */

import { NextRequest, NextResponse } from 'next/server'
import { computeRollingProposal } from '@/lib/qc/rollingLimits'
import { z } from 'zod'

// Query parameter validation schema
const ProposalQuerySchema = z.object({
  testCode: z.string().min(1, 'Test code required'),
  level: z.enum(['L1', 'L2', 'L3'], { message: 'Level must be L1, L2, or L3' }),
  lotCode: z.string().min(1, 'Lot code required'),
  deviceCode: z.string().min(1, 'Device code required'),
  n: z.coerce.number().int().min(20).max(200).optional().default(20),
})

export async function GET(request: NextRequest) {
  try {
    // Parse and validate query parameters
    const { searchParams } = new URL(request.url)
    const rawParams = {
      testCode: searchParams.get('testCode'),
      level: searchParams.get('level'),
      lotCode: searchParams.get('lotCode'),
      deviceCode: searchParams.get('deviceCode'),
      n: searchParams.get('n'),
    }

    const validatedParams = ProposalQuerySchema.parse(rawParams)

    // Compute the rolling proposal
    const proposal = await computeRollingProposal(validatedParams)

    return NextResponse.json({
      success: true,
      data: proposal,
    })

  } catch (error) {
    console.error('Error computing rolling proposal:', error)

    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid parameters',
          details: error.errors,
        },
        { status: 400 }
      )
    }

    // Handle other errors
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to compute rolling proposal',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
