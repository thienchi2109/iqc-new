import { NextRequest, NextResponse } from 'next/server'
import { withAuditAuth } from '@/lib/auth/withAudit'
import { db } from '@/lib/db/client'
import { ruleProfiles, ruleProfileBindings, tests, devices } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'
import { ruleScopeSchema } from '@/lib/qc/validation'

// Validation schema for creating bindings
const createBindingSchema = z.object({
  scopeType: ruleScopeSchema,
  testId: z.string().uuid().optional(),
  deviceId: z.string().uuid().optional(),
  activeFrom: z.string().datetime().optional(),
  activeTo: z.string().datetime().optional(),
}).refine((data) => {
  // Validate that required IDs are provided based on scope type
  if (data.scopeType === 'test' || data.scopeType === 'device_test') {
    if (!data.testId) return false
  }
  if (data.scopeType === 'device' || data.scopeType === 'device_test') {
    if (!data.deviceId) return false
  }
  return true
}, {
  message: 'testId is required for test/device_test scopes, deviceId is required for device/device_test scopes'
})

// POST /api/rule-profiles/[id]/bindings - Create binding
export const POST = withAuditAuth(
  async (request: NextRequest, user) => {
    try {
      const url = new URL(request.url)
      const pathSegments = url.pathname.split('/')
      const profileId = pathSegments[pathSegments.length - 2] // Get the ID before 'bindings'
      
      if (!profileId) {
        return NextResponse.json(
          { error: 'Profile ID is required' },
          { status: 400 }
        )
      }

      const body = await request.json()
      const bindingData = createBindingSchema.parse(body)

      // Check if profile exists
      const profile = await db
        .select({ id: ruleProfiles.id })
        .from(ruleProfiles)
        .where(eq(ruleProfiles.id, profileId))
        .limit(1)

      if (profile.length === 0) {
        return NextResponse.json(
          { error: 'Rule profile not found' },
          { status: 404 }
        )
      }

      // Validate referenced entities exist
      if (bindingData.testId) {
        const test = await db
          .select({ id: tests.id })
          .from(tests)
          .where(eq(tests.id, bindingData.testId))
          .limit(1)

        if (test.length === 0) {
          return NextResponse.json(
            { error: 'Referenced test not found' },
            { status: 400 }
          )
        }
      }

      if (bindingData.deviceId) {
        const device = await db
          .select({ id: devices.id })
          .from(devices)
          .where(eq(devices.id, bindingData.deviceId))
          .limit(1)

        if (device.length === 0) {
          return NextResponse.json(
            { error: 'Referenced device not found' },
            { status: 400 }
          )
        }
      }

      // Check for conflicting bindings (same scope + entities + overlapping time)
      let conflictQuery = db
        .select({ id: ruleProfileBindings.id })
        .from(ruleProfileBindings)
        .where(
          and(
            eq(ruleProfileBindings.scopeType, bindingData.scopeType),
            bindingData.testId 
              ? eq(ruleProfileBindings.testId, bindingData.testId)
              : undefined,
            bindingData.deviceId
              ? eq(ruleProfileBindings.deviceId, bindingData.deviceId)
              : undefined
          )
        )

      // Note: For production, should also check for time overlap
      // This is simplified for MVP
      const conflicting = await conflictQuery.limit(1)

      if (conflicting.length > 0) {
        return NextResponse.json(
          { error: 'A binding with the same scope already exists' },
          { status: 409 }
        )
      }

      // Create the binding
      const [newBinding] = await db
        .insert(ruleProfileBindings)
        .values({
          profileId,
          scopeType: bindingData.scopeType,
          testId: bindingData.testId || null,
          deviceId: bindingData.deviceId || null,
          activeFrom: bindingData.activeFrom ? new Date(bindingData.activeFrom) : new Date(),
          activeTo: bindingData.activeTo ? new Date(bindingData.activeTo) : null,
        })
        .returning()

      return NextResponse.json(newBinding, { status: 201 })
    } catch (error) {
      console.error('Error creating rule profile binding:', error)
      
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Invalid input data', details: error.errors },
          { status: 400 }
        )
      }
      
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  },
  { permission: 'rule-profiles:bind' },
  { entity: 'rule_profile_binding', action: 'CREATE' }
)

// GET /api/rule-profiles/[id]/bindings - List bindings for a profile
export const GET = withAuditAuth(
  async (request: NextRequest, user) => {
    try {
      const url = new URL(request.url)
      const pathSegments = url.pathname.split('/')
      const profileId = pathSegments[pathSegments.length - 2] // Get the ID before 'bindings'
      
      if (!profileId) {
        return NextResponse.json(
          { error: 'Profile ID is required' },
          { status: 400 }
        )
      }

      // Check if profile exists
      const profile = await db
        .select({ id: ruleProfiles.id })
        .from(ruleProfiles)
        .where(eq(ruleProfiles.id, profileId))
        .limit(1)

      if (profile.length === 0) {
        return NextResponse.json(
          { error: 'Rule profile not found' },
          { status: 404 }
        )
      }

      // Get bindings with joined test and device names for easier display
      const bindings = await db
        .select({
          id: ruleProfileBindings.id,
          profileId: ruleProfileBindings.profileId,
          scopeType: ruleProfileBindings.scopeType,
          testId: ruleProfileBindings.testId,
          testName: tests.name,
          deviceId: ruleProfileBindings.deviceId,
          deviceName: devices.name,
          activeFrom: ruleProfileBindings.activeFrom,
          activeTo: ruleProfileBindings.activeTo,
        })
        .from(ruleProfileBindings)
        .leftJoin(tests, eq(ruleProfileBindings.testId, tests.id))
        .leftJoin(devices, eq(ruleProfileBindings.deviceId, devices.id))
        .where(eq(ruleProfileBindings.profileId, profileId))

      return NextResponse.json(bindings)
    } catch (error) {
      console.error('Error fetching rule profile bindings:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  },
  { permission: 'rule-profiles:read' },
  { entity: 'rule_profile_binding', action: 'LIST' }
)
