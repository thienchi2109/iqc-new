import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'
import { db } from '@/lib/db/client'
import { runGroups } from '@/lib/db/schema'
import { createRunGroupSchema } from '@/lib/qc/validation'
import { eq, and, desc } from 'drizzle-orm'

// POST /api/qc/run-groups - Create a new run group for multi-level QC entry
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only tech, supervisor roles can create run groups
    if (!['tech', 'supervisor', 'qaqc', 'admin'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const groupData = createRunGroupSchema.parse(body)

    const [newGroup] = await db
      .insert(runGroups)
      .values({
        ...groupData,
        runAt: new Date(groupData.runAt),
        createdBy: session.user.id,
      })
      .returning()

    return NextResponse.json(newGroup)
  } catch (error) {
    console.error('Error creating run group:', error)
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET /api/qc/run-groups - Get run groups
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const deviceId = searchParams.get('deviceId')
    const testId = searchParams.get('testId')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    let query = db.select().from(runGroups)

    // Apply filters if provided
    if (deviceId && testId) {
      query = query.where(
        and(
          eq(runGroups.deviceId, deviceId),
          eq(runGroups.testId, testId)
        )
      ) as typeof query
    } else if (deviceId) {
      query = query.where(eq(runGroups.deviceId, deviceId)) as typeof query
    } else if (testId) {
      query = query.where(eq(runGroups.testId, testId)) as typeof query
    }

    const groups = await query
      .orderBy(desc(runGroups.runAt))
      .limit(limit)
      .offset(offset)

    return NextResponse.json(groups)
  } catch (error) {
    console.error('Error fetching run groups:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}