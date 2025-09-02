import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { db } from '@/lib/db/client'
import { qcRuns, qcLimits, violations, qcLots, runGroups } from '@/lib/db/schema'
import { createQcRunSchema, qcRunFiltersSchema } from '@/lib/qc/validation'
import { WestgardEngine } from '@/lib/qc/westgardEngine'
import { eq, and, desc, sql, gte, lte } from 'drizzle-orm'

// GET /api/qc/runs - Retrieve QC runs with filtering
export const GET = withAuth(
  async (request: NextRequest, user) => {
    try {
      const { searchParams } = new URL(request.url)
      const filters = qcRunFiltersSchema.parse(Object.fromEntries(searchParams))

      let query = db
        .select({
          id: qcRuns.id,
          groupId: qcRuns.groupId,
          deviceId: qcRuns.deviceId,
          testId: qcRuns.testId,
          levelId: qcRuns.levelId,
          lotId: qcRuns.lotId,
          value: qcRuns.value,
          unitId: qcRuns.unitId,
          methodId: qcRuns.methodId,
          performerId: qcRuns.performerId,
          status: qcRuns.status,
          z: qcRuns.z,
          side: qcRuns.side,
          notes: qcRuns.notes,
          createdAt: qcRuns.createdAt,
        })
        .from(qcRuns)

      // Apply access control - techs can only see their own runs
      const conditions = []
      if (user.role === 'tech') {
        conditions.push(eq(qcRuns.performerId, user.id))
      }

      // Apply filters
      if (filters.deviceId) conditions.push(eq(qcRuns.deviceId, filters.deviceId))
      if (filters.testId) conditions.push(eq(qcRuns.testId, filters.testId))
      if (filters.levelId) conditions.push(eq(qcRuns.levelId, filters.levelId))
      if (filters.lotId) conditions.push(eq(qcRuns.lotId, filters.lotId))
      if (filters.status) conditions.push(eq(qcRuns.status, filters.status))
      if (filters.performerId) conditions.push(eq(qcRuns.performerId, filters.performerId))
      if (filters.from) conditions.push(gte(qcRuns.createdAt, new Date(filters.from)))
      if (filters.to) conditions.push(lte(qcRuns.createdAt, new Date(filters.to)))

      if (conditions.length > 0) {
        query = query.where(and(...conditions))
      }

      const runs = await query
        .orderBy(desc(qcRuns.createdAt))
        .limit(filters.limit)
        .offset(filters.offset)

      return NextResponse.json(runs)
    } catch (error) {
      console.error('Error fetching QC runs:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  },
  { permission: 'qc-runs:read' }
)

// POST /api/qc/runs - Create new QC run with Westgard evaluation
export const POST = withAuth(
  async (request: NextRequest, user) => {
    try {
      const body = await request.json()
      const runData = createQcRunSchema.parse(body)

      // Ensure performer ID matches current user for techs
      if (user.role === 'tech' && runData.performerId !== user.id) {
        return NextResponse.json(
          { error: 'Technicians can only create runs for themselves' },
          { status: 403 }
        )
      }

      // Start transaction
      const result = await db.transaction(async (tx) => {
        // 1. Check lot expiration
        const [lot] = await tx
          .select()
          .from(qcLots)
          .where(eq(qcLots.id, runData.lotId))
          .limit(1)

        if (!lot) {
          throw new Error('QC lot not found')
        }

        const today = new Date()
        const expireDate = new Date(lot.expireDate)
        if (today > expireDate) {
          throw new Error('QC lot has expired')
        }

        // 2. Get QC limits
        const [limits] = await tx
          .select()
          .from(qcLimits)
          .where(
            and(
              eq(qcLimits.testId, runData.testId),
              eq(qcLimits.levelId, runData.levelId),
              eq(qcLimits.lotId, runData.lotId),
              eq(qcLimits.deviceId, runData.deviceId)
            )
          )
          .limit(1)

        if (!limits) {
          throw new Error('QC limits not configured for this combination')
        }

        // 3. Get historical data for Westgard evaluation (last 12 points)
        const historicalRuns = await tx
          .select({
            id: qcRuns.id,
            value: qcRuns.value,
            z: qcRuns.z,
            side: qcRuns.side,
            createdAt: qcRuns.createdAt,
            levelId: qcRuns.levelId,
          })
          .from(qcRuns)
          .where(
            and(
              eq(qcRuns.testId, runData.testId),
              eq(qcRuns.deviceId, runData.deviceId),
              eq(qcRuns.levelId, runData.levelId),
              eq(qcRuns.lotId, runData.lotId)
            )
          )
          .orderBy(desc(qcRuns.createdAt))
          .limit(12)

        // 4. Get peer runs in same group (for R-4s rule)
        let peerRuns: Record<string, { z: number; levelId: string }> = {}
        if (runData.groupId) {
          const groupRuns = await tx
            .select({
              z: qcRuns.z,
              levelId: qcRuns.levelId,
            })
            .from(qcRuns)
            .where(eq(qcRuns.groupId, runData.groupId))

          peerRuns = groupRuns.reduce((acc, run) => {
            acc[run.levelId] = { z: Number(run.z), levelId: run.levelId }
            return acc
          }, {} as Record<string, { z: number; levelId: string }>)
        }

        // 5. Evaluate with Westgard engine
        const qcLimitData = {
          mean: Number(limits.mean),
          sd: Number(limits.sd),
          cv: Number(limits.cv),
        }

        const historicalData = historicalRuns.map(run => ({
          id: run.id,
          value: Number(run.value),
          z: Number(run.z || 0),
          side: run.side as 'above' | 'below' | 'on',
          createdAt: run.createdAt!,
          levelId: run.levelId,
        }))

        const evaluation = WestgardEngine.evaluateQcRun(
          runData.value,
          qcLimitData,
          historicalData,
          Object.keys(peerRuns).length > 0 ? peerRuns : undefined
        )

        // 6. Create QC run record
        const [newRun] = await tx
          .insert(qcRuns)
          .values({
            ...runData,
            z: evaluation.z.toFixed(3),
            side: evaluation.side,
            status: evaluation.status,
            createdAt: new Date(),
          })
          .returning()

        // 7. Create violation records
        if (evaluation.violations.length > 0) {
          await tx.insert(violations).values(
            evaluation.violations.map(violation => ({
              runId: newRun.id,
              ruleCode: violation.ruleCode,
              severity: violation.severity,
              windowSize: violation.windowSize,
              details: violation.details,
            }))
          )
        }

        return {
          run: newRun,
          evaluation: {
            z: evaluation.z,
            side: evaluation.side,
            status: evaluation.status,
            violations: evaluation.violations,
          },
        }
      })

      return NextResponse.json(result)
    } catch (error) {
      console.error('Error creating QC run:', error)
      if (error instanceof Error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  },
  { permission: 'qc-runs:create' }
)