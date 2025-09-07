import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { db } from '@/lib/db/client'
import { qcRuns, users, auditLog } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { authOptions } from '@/lib/auth/config'

const BulkRejectSchema = z.object({
  runIds: z.array(z.string().uuid()),
  note: z.string().min(1, 'Rejection note is required')
})

interface BulkRejectResult {
  rejected: string[]
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

    // Only supervisors, QA/QC, and admins can reject runs
    const user = await db.query.users.findFirst({
      where: eq(users.id, session.user.id)
    })

    if (!user || !['supervisor', 'qaqc', 'admin'].includes(user.role)) {
      return NextResponse.json({ 
        error: 'Insufficient permissions. Only supervisors, QA/QC staff, and administrators can reject QC runs.' 
      }, { status: 403 })
    }

    // Validate request body
    const body = await request.json()
    const validation = BulkRejectSchema.safeParse(body)
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
    const result: BulkRejectResult = {
      rejected: [],
      skipped: [],
      batchId
    }

    // Process each ID independently (best-effort approach)
    for (const id of runIds) {
      try {
        // Get the QC run
        const run = await db.query.qcRuns.findFirst({
          where: eq(qcRuns.id, id),
          with: {
            violations: true
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
        if (run.approvalState === 'rejected') {
          result.skipped.push({
            id,
            reason: 'Already rejected'
          })
          continue
        }

        if (run.approvalState === 'approved') {
          result.skipped.push({
            id,
            reason: 'Already approved'
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

        // Update the QC run to rejected state in its own transaction
        await db.transaction(async (tx) => {
          // Update approval state
          await tx.update(qcRuns)
            .set({
              approvalState: 'rejected',
              approvedBy: user.id,
              approvedAt: new Date(),
              approvalNote: note
            })
            .where(eq(qcRuns.id, id))

          // Log the rejection action
          await tx.insert(auditLog).values({
            actorId: user.id,
            action: 'reject_qc_run',
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
                approvalState: 'rejected',
                approvedBy: user.id,
                approvedAt: new Date().toISOString(),
                approvalNote: note
              },
              autoResult: run.autoResult,
              violationCount: run.violations?.length || 0,
              bulk: true,
              batchId
            }
          })
        })

        result.rejected.push(id)

      } catch (error) {
        console.error(`Error rejecting run ${id}:`, error)
        result.skipped.push({
          id,
          reason: 'Internal error during processing'
        })
      }
    }

    return NextResponse.json({
      successCount: result.rejected.length,
      failureCount: result.skipped.length,
      errors: result.skipped
    })

  } catch (error) {
    console.error('Error in bulk reject:', error)
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 })
  }
}
