/**
 * POST /api/qc/limits/proposals/bulk-actions
 * Bulk approve or skip multiple QC limit proposals
 * 
 * Request body:
 * {
 *   action: 'approve' | 'skip',
 *   proposalIds: string[],
 *   reason?: string (required for skip action)
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db/client'
import { qcLimitProposals, qcLimits } from '@/lib/db/schema'
import { eq, and, inArray, sql } from 'drizzle-orm'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth/config'
import { z } from 'zod'

const BulkActionSchema = z.object({
  action: z.enum(['approve', 'skip'], { message: 'Action must be approve or skip' }),
  proposalIds: z.array(z.string().uuid()).min(1, 'At least one proposal ID required'),
  reason: z.string().optional(),
}).refine((data) => {
  // Reason is required for skip action
  if (data.action === 'skip' && (!data.reason || data.reason.trim().length === 0)) {
    return false
  }
  return true
}, {
  message: 'Reason is required when skipping proposals',
  path: ['reason'],
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only supervisors and above can perform bulk actions
    if (!['supervisor', 'qaqc', 'admin'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { action, proposalIds, reason } = BulkActionSchema.parse(body)

    if (action === 'skip') {
      // Bulk skip is simpler - just update status
      const updatedProposals = await db
        .update(qcLimitProposals)
        .set({
          status: 'skipped',
          approvedBy: session.user.id,
          approvedAt: new Date(),
          notes: reason,
        })
        .where(and(
          inArray(qcLimitProposals.id, proposalIds),
          eq(qcLimitProposals.status, 'pending')
        ))
        .returning()

      return NextResponse.json({
        success: true,
        message: `${updatedProposals.length} proposals skipped successfully`,
        data: { processed: updatedProposals.length, skipped: updatedProposals },
      })
    }

    if (action === 'approve') {
      // Bulk approve is more complex - need transactions for each group
      const results = await db.transaction(async (tx) => {
        // Get all pending proposals
        const proposals = await tx
          .select()
          .from(qcLimitProposals)
          .where(and(
            inArray(qcLimitProposals.id, proposalIds),
            eq(qcLimitProposals.status, 'pending')
          ))

        const processedProposals = []
        const newLimits = []
        const expiredLimits = []

        for (const proposal of proposals) {
          // Get current active limit (if any)
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

          // Expire current limit if exists
          if (currentLimit) {
            await tx
              .update(qcLimits)
              .set({ effectiveTo: now })
              .where(eq(qcLimits.id, currentLimit.id))
            expiredLimits.push(currentLimit.id)
          }

          // Create new limit from proposal
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

          newLimits.push(newLimit)

          // Update proposal status
          const [updatedProposal] = await tx
            .update(qcLimitProposals)
            .set({
              status: 'approved',
              approvedBy: session.user.id,
              approvedAt: now,
              appliedLimitId: newLimit.id,
            })
            .where(eq(qcLimitProposals.id, proposal.id))
            .returning()

          processedProposals.push(updatedProposal)
        }

        return {
          processed: processedProposals.length,
          approved: processedProposals,
          newLimits,
          expiredLimits,
        }
      })

      return NextResponse.json({
        success: true,
        message: `${results.processed} proposals approved and applied successfully`,
        data: results,
      })
    }

  } catch (error) {
    console.error('Error performing bulk action:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to perform bulk action',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
