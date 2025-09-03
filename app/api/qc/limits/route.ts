import { NextRequest, NextResponse } from 'next/server'
import { withConfigAudit } from '@/lib/auth/withAudit'
import { withAuth } from '@/lib/auth/middleware'
import { db } from '@/lib/db/client'
import { qcLimits } from '@/lib/db/schema'
import { createQcLimitSchema } from '@/lib/qc/validation'
import { AuditLogger } from '@/lib/audit/logger'
import { eq, and } from 'drizzle-orm'

// POST /api/qc/limits - Create or update QC limits
export const POST = withConfigAudit(
  async (request: NextRequest, user) => {
    try {
      const body = await request.json()
      const limitData = createQcLimitSchema.parse(body)

      // Calculate CV automatically: (sd/mean) * 100
      const cv = (limitData.sd / limitData.mean) * 100

      // Check if limits already exist for this combination
      const [existingLimit] = await db
        .select()
        .from(qcLimits)
        .where(
          and(
            eq(qcLimits.testId, limitData.testId),
            eq(qcLimits.levelId, limitData.levelId),
            eq(qcLimits.lotId, limitData.lotId),
            eq(qcLimits.deviceId, limitData.deviceId)
          )
        )
        .limit(1)

      let result
      if (existingLimit) {
        // Log the update with before/after values
        const oldValues = {
          mean: existingLimit.mean,
          sd: existingLimit.sd,
          cv: existingLimit.cv,
          source: existingLimit.source,
        }
        
        const newValues: Record<string, any> = {
          mean: limitData.mean.toString(),
          sd: limitData.sd.toString(),
          cv: cv.toFixed(2),
          source: limitData.source,
        }

        // Update existing limits
        const result = await db
          .update(qcLimits)
          .set({
            ...newValues,
            createdBy: user.id,
          })
          .where(eq(qcLimits.id, existingLimit.id))
          .returning()

        // Log the update
        await AuditLogger.logUpdate(
          user,
          'qc_limits',
          existingLimit.id,
          oldValues,
          newValues,
          {
            testId: limitData.testId,
            levelId: limitData.levelId,
            lotId: limitData.lotId,
            deviceId: limitData.deviceId,
          }
        )
      } else {
        // Create new limits
        const result = await db
          .insert(qcLimits)
          .values({
            ...limitData,
            mean: limitData.mean.toString(),
            sd: limitData.sd.toString(),
            cv: cv.toFixed(2),
            createdBy: user.id,
          })
          .returning()

        // Log the creation
        const newLimitData = {
          ...limitData,
          mean: limitData.mean.toString(),
          sd: limitData.sd.toString(),
          cv: cv.toFixed(2),
          createdBy: user.id,
        }
        
        await AuditLogger.logCreate(
          user,
          'qc_limits',
          result[0]?.id || '',
          newLimitData,
          {
            testId: limitData.testId,
            levelId: limitData.levelId,
            lotId: limitData.lotId,
            deviceId: limitData.deviceId,
          }
        )
      }

      return NextResponse.json(result)
    } catch (error) {
      console.error('Error creating/updating QC limits:', error)
      if (error instanceof Error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  },
  { permission: 'qc-limits:write' }
)

// GET /api/qc/limits - Get QC limits
export const GET = withAuth(
  async (request: NextRequest, user) => {
    try {
      const { searchParams } = new URL(request.url)
      const testId = searchParams.get('testId')
      const levelId = searchParams.get('levelId')
      const lotId = searchParams.get('lotId')
      const deviceId = searchParams.get('deviceId')

      let query = db.select().from(qcLimits)

      // Apply filters
      const conditions = []
      if (testId) conditions.push(eq(qcLimits.testId, testId))
      if (levelId) conditions.push(eq(qcLimits.levelId, levelId))
      if (lotId) conditions.push(eq(qcLimits.lotId, lotId))
      if (deviceId) conditions.push(eq(qcLimits.deviceId, deviceId))

      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as typeof query
      }

      const limits = await query

      return NextResponse.json(limits)
    } catch (error) {
      console.error('Error fetching QC limits:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  },
  { permission: 'qc-limits:read' }
)