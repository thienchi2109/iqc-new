import { NextRequest, NextResponse } from 'next/server'
import { withAuditAuth } from '@/lib/auth/withAudit'
import { resolveProfile } from '@/lib/qc/resolveProfile'
import { z } from 'zod'

// Validation schema for resolve parameters
const resolveParamsSchema = z.object({
  deviceId: z.string().uuid('Invalid device ID format'),
  testId: z.string().uuid('Invalid test ID format'),
  at: z.string().datetime().optional()
})

// GET /api/rule-profiles/resolve - Resolve effective rule profile
export const GET = withAuditAuth(
  async (request: NextRequest, user) => {
    try {
      const { searchParams } = new URL(request.url)
      
      const params = {
        deviceId: searchParams.get('deviceId'),
        testId: searchParams.get('testId'),
        at: searchParams.get('at')
      }

      // Validate required parameters
      if (!params.deviceId || !params.testId) {
        return NextResponse.json(
          { error: 'deviceId and testId are required query parameters' },
          { status: 400 }
        )
      }

      const validatedParams = resolveParamsSchema.parse(params)

      // Resolve the effective profile
      const config = await resolveProfile({
        deviceId: validatedParams.deviceId,
        testId: validatedParams.testId,
        at: validatedParams.at ? new Date(validatedParams.at) : new Date()
      })

      // Include metadata about the resolution
      const response = {
        resolvedAt: new Date().toISOString(),
        deviceId: validatedParams.deviceId,
        testId: validatedParams.testId,
        evaluatedAt: validatedParams.at || new Date().toISOString(),
        profileConfigEnabled: process.env.USE_PROFILE_CONFIG === 'true',
        config
      }

      return NextResponse.json(response)
    } catch (error) {
      console.error('Error resolving rule profile:', error)
      
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Invalid parameters', details: error.errors },
          { status: 400 }
        )
      }
      
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  },
  { permission: 'rule-profiles:read' },
  { entity: 'rule_profile', action: 'RESOLVE' }
)
