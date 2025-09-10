/**
 * PATCH /api/qc/limits/proposals/[id]/approve
 * Approve a QC limit proposal and apply it as the new limit
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db/client'
import { qcLimitProposals, qcLimits } from '@/lib/db/schema'
import { eq, and, sql } from 'drizzle-orm'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth/config'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only supervisors and above can approve proposals
    if (!['supervisor', 'qaqc', 'admin'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { id } = await params
    const proposalId = id

    // Start transaction to ensure atomicity
    const result = await db.transaction(async (tx) => {
      // 1. Get the proposal
      const [proposal] = await tx
        .select()
        .from(qcLimitProposals)
        .where(and(
          eq(qcLimitProposals.id, proposalId),
          eq(qcLimitProposals.status, 'pending')
        ))
        .limit(1)

      if (!proposal) {
        throw new Error('Proposal not found or already processed')
      }

      // 2. Get current active limit (if any)
      const [currentLimit] = await tx
        .select()
        .from(qcLimits)
        .where(and(
          eq(qcLimits.testId, proposal.testId),
          eq(qcLimits.levelId, proposal.levelId),
          eq(qcLimits.lotId, proposal.lotId),
          eq(qcLimits.deviceId, proposal.deviceId),
          sql`${qcLimits.effectiveTo} IS NULL` // Current active version
        ))
        .limit(1)

      const now = new Date()

      // 3. If there's a current limit, expire it
      if (currentLimit) {
        await tx
          .update(qcLimits)
          .set({ effectiveTo: now })
          .where(eq(qcLimits.id, currentLimit.id))
      }

      // 4. Create new limit from proposal
      const [newLimit] = await tx
        .insert(qcLimits)
        .values({
          testId: proposal.testId,
          levelId: proposal.levelId,
          lotId: proposal.lotId,
          deviceId: proposal.deviceId,
          mean: proposal.mean,
          sd: proposal.sd,
          cv: proposal.cv,
          source: 'lab', // Computed from lab data
          createdBy: session.user.id,
          effectiveFrom: now,
          effectiveTo: null, // Active version
          approvedBy: session.user.id,
        })
        .returning()

      // 5. Update proposal status
      const [updatedProposal] = await tx
        .update(qcLimitProposals)
        .set({
          status: 'approved',
          approvedBy: session.user.id,
          approvedAt: now,
          appliedLimitId: newLimit.id,
        })
        .where(eq(qcLimitProposals.id, proposalId))
        .returning()

      return {
        proposal: updatedProposal,
        newLimit,
        expiredLimitId: currentLimit?.id,
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Proposal approved and applied successfully',
      data: result,
    })

  } catch (error) {
    console.error('Error approving proposal:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to approve proposal',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
