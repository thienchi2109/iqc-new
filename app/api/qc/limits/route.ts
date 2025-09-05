import { NextRequest, NextResponse } from 'next/server'
import { withConfigAudit } from '@/lib/auth/withAudit'
import { withAuth } from '@/lib/auth/middleware'
import { db } from '@/lib/db/client'
import { qcLimits, tests, devices, qcLevels, qcLots } from '@/lib/db/schema'
import { createQcLimitSchema, updateQcLimitSchema } from '@/lib/qc/validation'
import { AuditLogger } from '@/lib/audit/logger'
import { eq, and, sql } from 'drizzle-orm'

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

// GET /api/qc/limits - Get QC limits with pretty/joined fields
export const GET = withAuth(
  async (request: NextRequest, user) => {
    try {
      const { searchParams } = new URL(request.url)
      const testId = searchParams.get('testId')
      const levelId = searchParams.get('levelId')
      const lotId = searchParams.get('lotId')
      const deviceId = searchParams.get('deviceId')

      // Query with joins to return pretty fields instead of raw UUIDs
      let query = db
        .select({
          id: qcLimits.id,
          // Pretty fields from joins
          test: tests.code,
          testName: tests.name,
          device: devices.code,
          deviceName: devices.name,
          level: qcLevels.level,
          lot: qcLots.lotCode,
          // Statistical data
          mean: qcLimits.mean,
          sd: qcLimits.sd,
          cv: qcLimits.cv,
          source: qcLimits.source,
          createdBy: qcLimits.createdBy,
          // Keep original IDs for form operations
          testId: qcLimits.testId,
          deviceId: qcLimits.deviceId,
          levelId: qcLimits.levelId,
          lotId: qcLimits.lotId,
        })
        .from(qcLimits)
        .leftJoin(tests, eq(qcLimits.testId, tests.id))
        .leftJoin(devices, eq(qcLimits.deviceId, devices.id))
        .leftJoin(qcLevels, eq(qcLimits.levelId, qcLevels.id))
        .leftJoin(qcLots, eq(qcLimits.lotId, qcLots.id))

      // Apply filters
      const conditions = []
      if (testId) conditions.push(eq(qcLimits.testId, testId))
      if (levelId) conditions.push(eq(qcLimits.levelId, levelId))
      if (lotId) conditions.push(eq(qcLimits.lotId, lotId))
      if (deviceId) conditions.push(eq(qcLimits.deviceId, deviceId))

      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as typeof query
      }

      const limits = await query.orderBy(tests.code, qcLevels.level, qcLots.lotCode)

      // Convert numeric fields to numbers for frontend consumption
      const processedLimits = limits.map(limit => ({
        ...limit,
        mean: limit.mean ? Number(limit.mean) : null,
        sd: limit.sd ? Number(limit.sd) : null,
        cv: limit.cv ? Number(limit.cv) : null,
      }))

      return NextResponse.json(processedLimits)
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

// PUT /api/qc/limits?id=uuid - Update specific QC limit
export const PUT = withConfigAudit(
  async (request: NextRequest, user) => {
    try {
      const { searchParams } = new URL(request.url)
      const limitId = searchParams.get('id')
      
      if (!limitId) {
        return NextResponse.json({ error: 'QC Limit ID required' }, { status: 400 })
      }

      const body = await request.json()
      const limitData = updateQcLimitSchema.parse(body)

      // Get existing limit for audit trail first
      const [existingLimit] = await db
        .select()
        .from(qcLimits)
        .where(eq(qcLimits.id, limitId))
        .limit(1)

      if (!existingLimit) {
        return NextResponse.json({ error: 'QC Limit not found' }, { status: 404 })
      }

      // Merge with existing values to ensure we have complete data for CV calculation
      const updatedMean = limitData.mean ?? parseFloat(existingLimit.mean)
      const updatedSd = limitData.sd ?? parseFloat(existingLimit.sd)
      const updatedSource = limitData.source ?? existingLimit.source

      // Calculate CV automatically: (sd/mean) * 100
      const cv = (updatedSd / updatedMean) * 100

      const oldValues = {
        mean: existingLimit.mean,
        sd: existingLimit.sd,
        cv: existingLimit.cv,
        source: existingLimit.source,
      }
      
      const newValues: Record<string, any> = {
        mean: updatedMean.toString(),
        sd: updatedSd.toString(),
        cv: cv.toFixed(2),
        source: updatedSource,
      }

      const [updatedLimit] = await db
        .update(qcLimits)
        .set({
          ...newValues,
          createdBy: user.id,
        })
        .where(eq(qcLimits.id, limitId))
        .returning()

      // Log the update
      await AuditLogger.logUpdate(
        user,
        'qc_limits',
        limitId,
        oldValues,
        newValues,
        {
          testId: existingLimit.testId,
          levelId: existingLimit.levelId,
          lotId: existingLimit.lotId,
          deviceId: existingLimit.deviceId,
        }
      )

      return NextResponse.json(updatedLimit)
    } catch (error) {
      console.error('Error updating QC limit:', error)
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

// DELETE /api/qc/limits?id=uuid - Delete QC limit
export const DELETE = withConfigAudit(
  async (request: NextRequest, user) => {
    try {
      const { searchParams } = new URL(request.url)
      const limitId = searchParams.get('id')
      
      if (!limitId) {
        return NextResponse.json({ error: 'QC Limit ID required' }, { status: 400 })
      }

      // Get existing limit for audit trail
      const [existingLimit] = await db
        .select()
        .from(qcLimits)
        .where(eq(qcLimits.id, limitId))
        .limit(1)

      if (!existingLimit) {
        return NextResponse.json({ error: 'QC Limit not found' }, { status: 404 })
      }

      const [deletedLimit] = await db
        .delete(qcLimits)
        .where(eq(qcLimits.id, limitId))
        .returning()

      // Log the deletion
      await AuditLogger.logDelete(
        user,
        'qc_limits',
        limitId,
        existingLimit,
        {
          testId: existingLimit.testId,
          levelId: existingLimit.levelId,
          lotId: existingLimit.lotId,
          deviceId: existingLimit.deviceId,
        }
      )

      return NextResponse.json({ success: true, message: 'QC Limit deleted' })
    } catch (error) {
      console.error('Error deleting QC limit:', error)
      if (error instanceof Error && error.message.includes('foreign key')) {
        return NextResponse.json({ error: 'Cannot delete QC limit - it is being used by QC runs' }, { status: 400 })
      }
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  },
  { permission: 'qc-limits:write' }
)