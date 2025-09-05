import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'
import { db } from '@/lib/db/client'
import { qcLevels } from '@/lib/db/schema'
import { createQcLevelSchema } from '@/lib/qc/validation'
import { eq } from 'drizzle-orm'

// GET /api/qc/levels - Get QC levels
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const testId = searchParams.get('testId')
    const isActive = searchParams.get('isActive')

    let query = db.select().from(qcLevels)
    
    if (testId) {
      query = query.where(eq(qcLevels.testId, testId)) as typeof query
    }
    if (isActive !== null) {
      query = query.where(eq(qcLevels.isActive, isActive === 'true')) as typeof query
    }

    const levels = await query.orderBy(qcLevels.level)

    return NextResponse.json(levels)
  } catch (error) {
    console.error('Error fetching QC levels:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/qc/levels - Create QC level
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admin and qaqc can create QC levels
    if (!['admin', 'qaqc'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const levelData = createQcLevelSchema.parse(body)

    const [newLevel] = await db
      .insert(qcLevels)
      .values(levelData)
      .returning()

    return NextResponse.json(newLevel)
  } catch (error) {
    console.error('Error creating QC level:', error)
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/qc/levels?id=uuid - Update QC level
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admin and qaqc can update QC levels
    if (!['admin', 'qaqc'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const levelId = searchParams.get('id')
    
    if (!levelId) {
      return NextResponse.json({ error: 'QC Level ID required' }, { status: 400 })
    }

    const body = await request.json()
    const levelData = createQcLevelSchema.partial().parse(body)

    const [updatedLevel] = await db
      .update(qcLevels)
      .set(levelData)
      .where(eq(qcLevels.id, levelId))
      .returning()

    if (!updatedLevel) {
      return NextResponse.json({ error: 'QC Level not found' }, { status: 404 })
    }

    return NextResponse.json(updatedLevel)
  } catch (error) {
    console.error('Error updating QC level:', error)
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/qc/levels?id=uuid - Soft delete QC level
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admin and qaqc can delete QC levels
    if (!['admin', 'qaqc'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const levelId = searchParams.get('id')
    
    if (!levelId) {
      return NextResponse.json({ error: 'QC Level ID required' }, { status: 400 })
    }

    // Soft delete by setting isActive = false
    const [deletedLevel] = await db
      .update(qcLevels)
      .set({ isActive: false })
      .where(eq(qcLevels.id, levelId))
      .returning()

    if (!deletedLevel) {
      return NextResponse.json({ error: 'QC Level not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, message: 'QC Level deactivated' })
  } catch (error) {
    console.error('Error deleting QC level:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}