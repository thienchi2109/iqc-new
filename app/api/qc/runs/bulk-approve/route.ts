import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { db } from '@/lib/db/client'
import { qcRuns, users, capa, auditLog } from '@/lib/db/schema'
import { eq, and, desc } from 'drizzle-orm'
import { authOptions } from '@/lib/auth/config'

const BulkApproveSchema = z.object({
  runIds: z.array(z.string().uuid()),
  note: z.string().optional()
})

interface BulkApproveResult {
  approved: string[]
  skipped: Array<{
    id: string
    reason: string
  }>
  batchId: string
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication and authorization
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only supervisors, QA/QC, and admins can approve runs
    const user = await db.query.users.findFirst({
      where: eq(users.id, session.user.id)
    })

    if (!user || !['supervisor', 'qaqc', 'admin'].includes(user.role)) {
      return NextResponse.json({ 
        error: 'Insufficient permissions. Only supervisors, QA/QC staff, and administrators can approve QC runs.' 
      }, { status: 403 })
    }

    // Validate request body
    const body = await request.json()
    const validation = BulkApproveSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({
        error: 'Invalid request body',
        details: validation.error.issues
      }, { status: 400 })
    }

    const { runIds, note } = validation.data

    // Limit batch size to prevent performance issues
    if (runIds.length > 100) {
      return NextResponse.json({
        error: 'Batch size too large. Maximum 100 items per request.'
      }, { status: 400 })
    }

    // Check if approval gate is enabled
    const useApprovalGate = process.env.USE_APPROVAL_GATE !== 'false'
    if (!useApprovalGate) {
      return NextResponse.json({
        error: 'Approval workflow is disabled'
      }, { status: 400 })
    }

    const batchId = crypto.randomUUID()
    const result: BulkApproveResult = {
      approved: [],
      skipped: [],
      batchId
    }

    // Process each ID independently (best-effort approach)
    for (const id of runIds) {
      try {
        // Get the QC run with related data
        const run = await db.query.qcRuns.findFirst({
          where: eq(qcRuns.id, id),
          with: {
            test: true,
            device: true,
            level: true,
            lot: true,
            violations: true,
            capa: true
          }
        })

        if (!run) {
          result.skipped.push({
            id,
            reason: 'QC run not found'
          })
          continue
        }

        // Check if run is already approved or rejected
        if (run.approvalState === 'approved') {
          result.skipped.push({
            id,
            reason: 'Already approved'
          })
          continue
        }

        if (run.approvalState === 'rejected') {
          result.skipped.push({
            id,
            reason: 'Already rejected'
          })
          continue
        }

        if (run.approvalState !== 'pending') {
          result.skipped.push({
            id,
            reason: `Invalid state: ${run.approvalState}`
          })
          continue
        }

        // Business rule: If auto_result is 'fail', require either:
        // 1. An approved CAPA for this run, OR
        // 2. A subsequent passing run for the same test/device/level/lot combination
        if (run.autoResult === 'fail') {
          // Check for approved CAPA
          const approvedCapa = await db.query.capa.findFirst({
            where: and(
              eq(capa.runId, id),
              eq(capa.status, 'approved')
            )
          })

          if (!approvedCapa) {
            // Check for subsequent passing run
            const subsequentPassingRun = await db.query.qcRuns.findFirst({
              where: and(
                eq(qcRuns.testId, run.testId),
                eq(qcRuns.deviceId, run.deviceId),
                eq(qcRuns.levelId, run.levelId),
                eq(qcRuns.lotId, run.lotId),
                eq(qcRuns.autoResult, 'pass'),
                // Only consider runs created after this one
                // Note: We'll use a simple timestamp comparison
              ),
              orderBy: [desc(qcRuns.createdAt)]
            })

            if (!subsequentPassingRun || subsequentPassingRun.createdAt! <= run.createdAt!) {
              result.skipped.push({
                id,
                reason: 'Failed run requires approved CAPA or subsequent passing run'
              })
              continue
            }
          }
        }

        // Update the QC run to approved state in its own transaction
        await db.transaction(async (tx) => {
          // Update approval state
          await tx.update(qcRuns)
            .set({
              approvalState: 'approved',
              approvedBy: user.id,
              approvedAt: new Date(),
              approvalNote: note || null
            })
            .where(eq(qcRuns.id, id))

          // Log the approval action
          await tx.insert(auditLog).values({
            actorId: user.id,
            action: 'approve_qc_run',
            entity: 'qc_runs',
            entityId: id,
            diff: {
              before: {
                approvalState: 'pending',
                approvedBy: null,
                approvedAt: null,
                approvalNote: null
              },
              after: {
                approvalState: 'approved',
                approvedBy: user.id,
                approvedAt: new Date().toISOString(),
                approvalNote: note || null
              },
              autoResult: run.autoResult,
              violationCount: run.violations?.length || 0,
              bulk: true,
              batchId
            }
          })
        })

        result.approved.push(id)

      } catch (error) {
        console.error(`Error approving run ${id}:`, error)
        result.skipped.push({
          id,
          reason: 'Internal error during processing'
        })
      }
    }

    return NextResponse.json({
      successCount: result.approved.length,
      failureCount: result.skipped.length,
      errors: result.skipped
    })

  } catch (error) {
    console.error('Error in bulk approve:', error)
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 })
  }
}
