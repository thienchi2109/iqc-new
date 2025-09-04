import { NextRequest, NextResponse } from 'next/server'
import { withAuditAuth } from '@/lib/auth/withAudit'
import { db } from '@/lib/db/client'
import { ruleProfiles } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'
import { z } from 'zod'

// Validation schema for creating/updating rule profiles
const createRuleProfileSchema = z.object({
  name: z.string().min(3).max(100),
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
  })
})

// GET /api/rule-profiles - List all rule profiles
export const GET = withAuditAuth(
  async (request: NextRequest, user) => {
    try {
      const { searchParams } = new URL(request.url)
      
      // Optional filtering (for future use)
      const active = searchParams.get('active')
      const scope = searchParams.get('scope')

      let query = db
        .select({
          id: ruleProfiles.id,
          name: ruleProfiles.name,
          enabledRules: ruleProfiles.enabledRules,
          createdBy: ruleProfiles.createdBy,
          createdAt: ruleProfiles.createdAt,
          updatedAt: ruleProfiles.updatedAt,
        })
        .from(ruleProfiles)

      const profiles = await query.orderBy(desc(ruleProfiles.updatedAt))

      return NextResponse.json(profiles)
    } catch (error) {
      console.error('Error fetching rule profiles:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  },
  { permission: 'rule-profiles:read' },
  { entity: 'rule_profile', action: 'LIST' }
)

// POST /api/rule-profiles - Create new rule profile
export const POST = withAuditAuth(
  async (request: NextRequest, user) => {
    try {
      const body = await request.json()
      const profileData = createRuleProfileSchema.parse(body)

      // Check for duplicate names
      const existingProfile = await db
        .select({ id: ruleProfiles.id })
        .from(ruleProfiles)
        .where(eq(ruleProfiles.name, profileData.name))
        .limit(1)

      if (existingProfile.length > 0) {
        return NextResponse.json(
          { error: 'A profile with this name already exists' },
          { status: 409 }
        )
      }

      // Create the profile
      const [newProfile] = await db
        .insert(ruleProfiles)
        .values({
          name: profileData.name,
          enabledRules: profileData.enabledRules,
          createdBy: user.id,
        })
        .returning()

      return NextResponse.json(newProfile, { status: 201 })
    } catch (error) {
      console.error('Error creating rule profile:', error)
      
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
  { entity: 'rule_profile', action: 'CREATE' }
)
