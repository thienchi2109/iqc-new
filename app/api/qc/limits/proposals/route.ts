/**
 * POST /api/qc/limits/proposals
 * Create a new QC limit proposal from rolling computation
 * 
 * GET /api/qc/limits/proposals
 * List QC limit proposals with filtering and pagination
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db/client'
import { qcLimitProposals, users, tests, qcLevels, qcLots, devices } from '@/lib/db/schema'
import { computeRollingProposal, shouldSuggestProposal } from '@/lib/qc/rollingLimits'
import { and, eq, desc, sql, inArray } from 'drizzle-orm'
import { z } from 'zod'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth/config'

// Create proposal request schema
const CreateProposalSchema = z.object({
  testCode: z.string().min(1),
  level: z.enum(['L1', 'L2', 'L3']),
  lotCode: z.string().min(1),
  deviceCode: z.string().min(1),
  n: z.number().int().min(20).max(200).default(20),
  notes: z.string().optional(),
})

// List proposals query schema
const ListProposalsSchema = z.object({
  status: z.enum(['pending', 'approved', 'skipped']).optional(),
  testCode: z.string().optional(),
  deviceCode: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only supervisors and above can create proposals
    if (!['supervisor', 'qaqc', 'admin'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const params = CreateProposalSchema.parse(body)

    // Compute the rolling proposal
    const proposal = await computeRollingProposal(params)

    if (!proposal.eligible || !proposal.stats || !proposal.window) {
      return NextResponse.json({
        success: false,
        error: 'Proposal not eligible',
        reasons: proposal.reasons,
      }, { status: 400 })
    }

    // Check if there's already a pending proposal for this group
    const existingProposal = await db
      .select({ id: qcLimitProposals.id })
      .from(qcLimitProposals)
      .innerJoin(tests, eq(tests.id, qcLimitProposals.testId))
      .innerJoin(qcLevels, eq(qcLevels.id, qcLimitProposals.levelId))
      .innerJoin(qcLots, eq(qcLots.id, qcLimitProposals.lotId))
      .innerJoin(devices, eq(devices.id, qcLimitProposals.deviceId))
      .where(and(
        eq(tests.code, params.testCode),
        sql`${qcLevels.level} = ${params.level}`,
        eq(qcLots.lotCode, params.lotCode),
        eq(devices.code, params.deviceCode),
        eq(qcLimitProposals.status, 'pending')
      ))
      .limit(1)

    if (existingProposal.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'Pending proposal already exists for this group',
      }, { status: 409 })
    }

    // Resolve group IDs
    const groupData = await db
      .select({
        testId: tests.id,
        levelId: qcLevels.id,
        lotId: qcLots.id,
        deviceId: devices.id,
      })
      .from(tests)
      .innerJoin(qcLevels, and(
        eq(qcLevels.testId, tests.id),
        sql`${qcLevels.level} = ${params.level}`
      ))
      .innerJoin(qcLots, and(
        eq(qcLots.levelId, qcLevels.id),
        eq(qcLots.lotCode, params.lotCode)
      ))
      .innerJoin(devices, eq(devices.code, params.deviceCode))
      .where(eq(tests.code, params.testCode))
      .limit(1)

    if (groupData.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Group not found',
      }, { status: 404 })
    }

    const group = groupData[0]

    // Create the proposal
    const newProposal = await db
      .insert(qcLimitProposals)
      .values({
        testId: group.testId,
        levelId: group.levelId,
        lotId: group.lotId,
        deviceId: group.deviceId,
        rollingN: params.n,
        windowFrom: proposal.window.from,
        windowTo: proposal.window.to,
        mean: proposal.stats.mean.toString(),
        sd: proposal.stats.sd.toString(),
        cv: proposal.stats.cv.toString(),
        excludedCount: proposal.excludedCount,
        excludedRules: ['1-3s', '2-2s', 'R-4s', '4-1s', '10x', '1-2s'], // From ROLLING_CONFIG
        reasons: proposal.reasons,
        notes: params.notes,
        createdBy: session.user.id,
      })
      .returning()

    return NextResponse.json({
      success: true,
      data: newProposal[0],
      proposal,
    })

  } catch (error) {
    console.error('Error creating proposal:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create proposal' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const params = ListProposalsSchema.parse(Object.fromEntries(searchParams))

    // Build where conditions
    const conditions = []
    
    if (params.status) {
      conditions.push(eq(qcLimitProposals.status, params.status))
    }

    // Apply filters
    if (conditions.length > 0) {
      conditions.push(and(...conditions))
    }
    if (params.testCode) {
      conditions.push(eq(tests.code, params.testCode))
    }
    if (params.deviceCode) {
      conditions.push(eq(devices.code, params.deviceCode))
    }

    // Base query with joins
    let query = db
      .select({
        id: qcLimitProposals.id,
        testCode: tests.code,
        testName: tests.name,
        level: qcLevels.level,
        lotCode: qcLots.lotCode,
        deviceCode: devices.code,
        deviceName: devices.name,
        rollingN: qcLimitProposals.rollingN,
        windowFrom: qcLimitProposals.windowFrom,
        windowTo: qcLimitProposals.windowTo,
        mean: qcLimitProposals.mean,
        sd: qcLimitProposals.sd,
        cv: qcLimitProposals.cv,
        excludedCount: qcLimitProposals.excludedCount,
        reasons: qcLimitProposals.reasons,
        notes: qcLimitProposals.notes,
        status: qcLimitProposals.status,
        createdAt: qcLimitProposals.createdAt,
        createdByName: users.name,
        approvedByName: sql<string | null>`approved_user.name`,
        approvedAt: qcLimitProposals.approvedAt,
      })
      .from(qcLimitProposals)
      .innerJoin(tests, eq(tests.id, qcLimitProposals.testId))
      .innerJoin(qcLevels, eq(qcLevels.id, qcLimitProposals.levelId))
      .innerJoin(qcLots, eq(qcLots.id, qcLimitProposals.lotId))
      .innerJoin(devices, eq(devices.id, qcLimitProposals.deviceId))
      .innerJoin(users, eq(users.id, qcLimitProposals.createdBy))
      .leftJoin(
        sql`${users} AS approved_user`,
        eq(sql`approved_user.id`, qcLimitProposals.approvedBy)
      )

    // Apply filters
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as typeof query
    }

    // Apply pagination and ordering
    const offset = (params.page - 1) * params.limit
    const proposals = await query
      .orderBy(desc(qcLimitProposals.createdAt))
      .limit(params.limit)
      .offset(offset)

    // Get total count for pagination
    let totalQuery = db
      .select({ count: sql<number>`count(*)` })
      .from(qcLimitProposals)
      .innerJoin(tests, eq(tests.id, qcLimitProposals.testId))
      .innerJoin(qcLevels, eq(qcLevels.id, qcLimitProposals.levelId))
      .innerJoin(qcLots, eq(qcLots.id, qcLimitProposals.lotId))
      .innerJoin(devices, eq(devices.id, qcLimitProposals.deviceId))

    if (conditions.length > 0) {
      totalQuery = totalQuery.where(and(...conditions)) as typeof totalQuery
    }

    const totalResult = await totalQuery
    const total = totalResult[0]?.count || 0

    return NextResponse.json({
      success: true,
      data: proposals,
      pagination: {
        page: params.page,
        limit: params.limit,
        total,
        pages: Math.ceil(total / params.limit),
      },
    })

  } catch (error) {
    console.error('Error listing proposals:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to list proposals' },
      { status: 500 }
    )
  }
}
