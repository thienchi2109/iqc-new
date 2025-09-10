/**
 * PATCH /api/qc/limits/proposals/[id]/skip
 * Skip (reject) a QC limit proposal without applying changes
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db/client'
import { qcLimitProposals } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth/config'
import { z } from 'zod'

interface RouteParams {
  params: Promise<{ id: string }>
}

const SkipProposalSchema = z.object({
  reason: z.string().min(1, 'Skip reason is required').max(500, 'Reason too long'),
})

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only supervisors and above can skip proposals
    if (!['supervisor', 'qaqc', 'admin'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { id } = await params
    const proposalId = id
    const body = await request.json()
    const { reason } = SkipProposalSchema.parse(body)

    // Update proposal status to skipped
    const [updatedProposal] = await db
      .update(qcLimitProposals)
      .set({
        status: 'skipped',
        approvedBy: session.user.id,
        approvedAt: new Date(),
        notes: reason, // Store skip reason in notes
      })
      .where(and(
        eq(qcLimitProposals.id, proposalId),
        eq(qcLimitProposals.status, 'pending')
      ))
      .returning()

    if (!updatedProposal) {
      return NextResponse.json(
        {
          success: false,
          error: 'Proposal not found or already processed',
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Proposal skipped successfully',
      data: updatedProposal,
    })

  } catch (error) {
    console.error('Error skipping proposal:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to skip proposal',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
