import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { db } from '@/lib/db/client'
import { qcRuns, capa, auditLog, users } from '@/lib/db/schema'
import { eq, and, desc } from 'drizzle-orm'
import { z } from 'zod'
import { authOptions } from '@/lib/auth/config'

const ApproveSchema = z.object({
  approvalNote: z.string().optional(),
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
    const validation = ApproveSchema.safeParse(body)
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
        violations: true,
        capa: true
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
            eq(qcRuns.autoResult, 'pass')
          ),
          orderBy: [desc(qcRuns.createdAt)]
        })

        if (!subsequentPassingRun || subsequentPassingRun.createdAt! <= run.createdAt!) {
          return NextResponse.json({
            error: 'Cannot approve failed run without either an approved CAPA or a subsequent passing run for the same test/device/level/lot combination'
          }, { status: 400 })
        }
      }
    }

    // Update the QC run to approved state
    await db.transaction(async (tx) => {
      // Update approval state
      await tx.update(qcRuns)
        .set({
          approvalState: 'approved',
          approvedBy: user.id,
          approvedAt: new Date(),
          approvalNote: approvalNote || null
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
            approvalNote: approvalNote || null
          },
          autoResult: run.autoResult,
          violationCount: run.violations?.length || 0
        }
      })
    })

    return NextResponse.json({
      success: true,
      message: 'QC run approved successfully',
      runId: id,
      approvalState: 'approved',
      approvedBy: {
        id: user.id,
        name: user.name,
        username: user.username
      },
      approvedAt: new Date().toISOString(),
      approvalNote
    })

  } catch (error) {
    console.error('Error approving QC run:', error)
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 })
  }
}
