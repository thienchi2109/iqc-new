import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { db } from '@/lib/db/client'
import { qcRuns, auditLog, users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { authOptions } from '@/lib/auth/config'

const RejectSchema = z.object({
  approvalNote: z.string().min(1, 'Approval note is required when rejecting a QC run'),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
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
    const validation = RejectSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({
        error: 'Invalid request body',
        details: validation.error.issues
      }, { status: 400 })
    }

    const { approvalNote } = validation.data

    // Check if approval gate is enabled
    const useApprovalGate = process.env.USE_APPROVAL_GATE !== 'false'
    if (!useApprovalGate) {
      return NextResponse.json({
        error: 'Approval workflow is disabled'
      }, { status: 400 })
    }

    // Get the QC run with related data
    const run = await db.query.qcRuns.findFirst({
      where: eq(qcRuns.id, id),
      with: {
        test: true,
        device: true,
        level: true,
        lot: true,
        violations: true
      }
    })

    if (!run) {
      return NextResponse.json({ error: 'QC run not found' }, { status: 404 })
    }

    // Check if run is already approved or rejected
    if (run.approvalState !== 'pending') {
      return NextResponse.json({
        error: `QC run is already ${run.approvalState}`
      }, { status: 400 })
    }

    // Update the QC run to rejected state
    await db.transaction(async (tx) => {
      // Update approval state
      await tx.update(qcRuns)
        .set({
          approvalState: 'rejected',
          approvedBy: user.id,
          approvedAt: new Date(),
          approvalNote: approvalNote
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
            approvalNote: approvalNote
          },
          autoResult: run.autoResult,
          violationCount: run.violations?.length || 0,
          rejectionReason: approvalNote
        }
      })
    })

    return NextResponse.json({
      success: true,
      message: 'QC run rejected successfully',
      runId: id,
      approvalState: 'rejected',
      rejectedBy: {
        id: user.id,
        name: user.name,
        username: user.username
      },
      rejectedAt: new Date().toISOString(),
      rejectionReason: approvalNote
    })

  } catch (error) {
    console.error('Error rejecting QC run:', error)
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 })
  }
}
