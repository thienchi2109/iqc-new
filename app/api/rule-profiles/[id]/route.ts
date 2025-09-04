import { NextRequest, NextResponse } from 'next/server'
import { withAuditAuth } from '@/lib/auth/withAudit'
import { db } from '@/lib/db/client'
import { ruleProfiles } from '@/lib/db/schema'
import { eq, and, ne } from 'drizzle-orm'
import { z } from 'zod'

// Validation schema for updating rule profiles
const updateRuleProfileSchema = z.object({
  name: z.string().min(3).max(100).optional(),
  enabledRules: z.object({
    window_size_default: z.number().positive().optional(),
    rules: z.record(z.string(), z.object({
      enabled: z.boolean(),
      severity: z.enum(['warn', 'fail']).optional(),
      threshold_sd: z.number().positive().optional(),
      window: z.number().positive().optional(),
      n: z.number().positive().optional(),
      within_run_across_levels: z.boolean().optional(),
      across_runs: z.boolean().optional(),
      delta_sd: z.number().positive().optional(),
    }))
  }).optional()
})

// PUT /api/rule-profiles/[id] - Update rule profile
export const PUT = withAuditAuth(
  async (request: NextRequest, user) => {
    try {
      const url = new URL(request.url)
      const pathSegments = url.pathname.split('/')
      const id = pathSegments[pathSegments.length - 1]
      
      if (!id) {
        return NextResponse.json(
          { error: 'Profile ID is required' },
          { status: 400 }
        )
      }

      const body = await request.json()
      const profileData = updateRuleProfileSchema.parse(body)

      // Check if profile exists
      const existingProfile = await db
        .select()
        .from(ruleProfiles)
        .where(eq(ruleProfiles.id, id))
        .limit(1)

      if (existingProfile.length === 0) {
        return NextResponse.json(
          { error: 'Rule profile not found' },
          { status: 404 }
        )
      }

      // Check for duplicate names if name is being updated
      if (profileData.name) {
        const duplicateProfile = await db
          .select({ id: ruleProfiles.id })
          .from(ruleProfiles)
          .where(
            and(
              eq(ruleProfiles.name, profileData.name),
              ne(ruleProfiles.id, id)
            )
          )
          .limit(1)

        if (duplicateProfile.length > 0) {
          return NextResponse.json(
            { error: 'A profile with this name already exists' },
            { status: 409 }
          )
        }
      }

      // Update the profile
      const updateData: any = {
        updatedAt: new Date(),
      }

      if (profileData.name) {
        updateData.name = profileData.name
      }

      if (profileData.enabledRules) {
        updateData.enabledRules = profileData.enabledRules
      }

      const [updatedProfile] = await db
        .update(ruleProfiles)
        .set(updateData)
        .where(eq(ruleProfiles.id, id))
        .returning()

      return NextResponse.json(updatedProfile)
    } catch (error) {
      console.error('Error updating rule profile:', error)
      
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
  { permission: 'rule-profiles:write' },
  { entity: 'rule_profile', action: 'UPDATE' }
)

// GET /api/rule-profiles/[id] - Get specific rule profile
export const GET = withAuditAuth(
  async (request: NextRequest, user) => {
    try {
      const url = new URL(request.url)
      const pathSegments = url.pathname.split('/')
      const id = pathSegments[pathSegments.length - 1]
      
      if (!id) {
        return NextResponse.json(
          { error: 'Profile ID is required' },
          { status: 400 }
        )
      }

      const profile = await db
        .select()
        .from(ruleProfiles)
        .where(eq(ruleProfiles.id, id))
        .limit(1)

      if (profile.length === 0) {
        return NextResponse.json(
          { error: 'Rule profile not found' },
          { status: 404 }
        )
      }

      return NextResponse.json(profile[0])
    } catch (error) {
      console.error('Error fetching rule profile:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  },
  { permission: 'rule-profiles:read' },
  { entity: 'rule_profile', action: 'VIEW' }
)
