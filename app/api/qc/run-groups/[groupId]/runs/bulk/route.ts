import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { db } from '@/lib/db/client'
import { qcRuns, qcLimits, violations, qcLots } from '@/lib/db/schema'
import { createQcRunSchema } from '@/lib/qc/validation'
import { WestgardEngine } from '@/lib/qc/westgardEngine'
import { eq, and, desc, sql } from 'drizzle-orm'
import { z } from 'zod'

// Schema for bulk QC run creation
const bulkCreateQcRunsSchema = z.object({
  runs: z.array(createQcRunSchema)
})

// POST /api/qc/run-groups/[groupId]/runs/bulk - Create multiple QC runs in a single transaction
export const POST = withAuth(
  async (request: NextRequest, user) => {
    try {
      const url = new URL(request.url)
      const pathSegments = url.pathname.split('/')
      const groupIdIndex = pathSegments.findIndex(segment => segment === 'run-groups') + 1
      const groupId = pathSegments[groupIdIndex]
      
      if (!groupId) {
        return NextResponse.json(
          { error: 'Group ID is required' },
          { status: 400 }
        )
      }

      const body = await request.json()
      const { runs } = bulkCreateQcRunsSchema.parse(body)

      // Validate that all runs belong to the same group
      if (runs.some(run => run.groupId !== groupId)) {
        return NextResponse.json(
          { error: 'All runs must belong to the same group' },
          { status: 400 }
        )
      }

      // Ensure performer ID matches current user for techs
      if (user.role === 'tech' && runs.some(run => run.performerId !== user.id)) {
        return NextResponse.json(
          { error: 'Technicians can only create runs for themselves' },
          { status: 403 }
        )
      }

      // For supervisors/admins, validate that performer exists if overriding
      if (['supervisor', 'admin'].includes(user.role)) {
        const performerIds = Array.from(new Set(runs.map(run => run.performerId)))
        for (const performerId of performerIds) {
          if (performerId !== user.id) {
            const [performer] = await db
              .select({ id: sql`id` })
              .from(sql.raw('users'))
              .where(sql`id = ${performerId}`)
              .limit(1)

            if (!performer) {
              return NextResponse.json(
                { error: `Invalid performer ID: ${performerId}` },
                { status: 400 }
              )
            }
          }
        }
      }

      // Start transaction for bulk creation
      const result = await db.transaction(async (tx) => {
        const createdRuns = []
        const allViolations = []
        const evaluationResults = []

        // Process each run
        for (const runData of runs) {
          // 1. Check lot expiration
          const [lot] = await tx
            .select()
            .from(qcLots)
            .where(eq(qcLots.id, runData.lotId))
            .limit(1)

          if (!lot) {
            throw new Error(`QC lot not found for run: ${runData.levelId}`)
          }

          const today = new Date()
          const expireDate = new Date(lot.expireDate)
          if (today > expireDate) {
            throw new Error(`QC lot has expired for level: ${runData.levelId}`)
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
            throw new Error(`QC limits not configured for combination: device=${runData.deviceId}, test=${runData.testId}, level=${runData.levelId}, lot=${runData.lotId}`)
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
          const groupRuns = await tx
            .select({
              z: qcRuns.z,
              levelId: qcRuns.levelId,
            })
            .from(qcRuns)
            .where(eq(qcRuns.groupId, groupId))

          peerRuns = groupRuns.reduce((acc, run) => {
            acc[run.levelId] = { z: Number(run.z), levelId: run.levelId }
            return acc
          }, {} as Record<string, { z: number; levelId: string }>)

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
              value: runData.value.toString(),
              z: evaluation.z.toFixed(3),
              side: evaluation.side,
              status: evaluation.status,
              autoResult: evaluation.autoResult,
              // approvalState defaults to 'pending' in schema
              createdAt: new Date(),
            })
            .returning()

          createdRuns.push(newRun)
          evaluationResults.push({
            runId: newRun.id,
            z: evaluation.z,
            side: evaluation.side,
            status: evaluation.status,
            autoResult: evaluation.autoResult,
            violations: evaluation.violations,
          })

          // 7. Create violation records
          if (evaluation.violations.length > 0) {
            const violationRecords = evaluation.violations.map(violation => ({
              runId: newRun.id,
              ruleCode: violation.ruleCode,
              severity: violation.severity,
              windowSize: violation.windowSize,
              details: violation.details,
            }))
            
            await tx.insert(violations).values(violationRecords)
            allViolations.push(...violationRecords)
          }
        }

        return {
          runs: createdRuns,
          evaluations: evaluationResults,
          violations: allViolations,
          groupId: groupId,
        }
      })

      return NextResponse.json(result)
    } catch (error) {
      console.error('Error creating bulk QC runs:', error)
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Validation error', details: error.errors },
          { status: 400 }
        )
      }
      if (error instanceof Error) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        )
      }
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  },
  { permission: 'qc-runs:create' }
)