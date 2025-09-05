import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'
import { db } from '@/lib/db/client'
import { qcLots } from '@/lib/db/schema'
import { createQcLotSchema } from '@/lib/qc/validation'
import { eq, inArray } from 'drizzle-orm'

// GET /api/qc/lots - Get QC lots
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const levelIds = searchParams.getAll('levelId')
    const levelId = searchParams.get('levelId')

    let query = db.select().from(qcLots)
    
    if (levelIds.length > 0) {
      query = query.where(inArray(qcLots.levelId, levelIds)) as typeof query
    } else if (levelId) {
      query = query.where(eq(qcLots.levelId, levelId)) as typeof query
    }

    const lots = await query.orderBy(qcLots.expireDate)

    return NextResponse.json(lots)
  } catch (error) {
    console.error('Error fetching QC lots:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/qc/lots - Create QC lot
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admin and qaqc can create QC lots
    if (!['admin', 'qaqc'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const lotData = createQcLotSchema.parse(body)

    const [newLot] = await db
      .insert(qcLots)
      .values({
        ...lotData,
        expireDate: new Date(lotData.expireDate).toISOString().split('T')[0],
        effectiveFrom: new Date(lotData.effectiveFrom).toISOString().split('T')[0],
        effectiveTo: lotData.effectiveTo ? new Date(lotData.effectiveTo).toISOString().split('T')[0] : null,
      })
      .returning()

    return NextResponse.json(newLot)
  } catch (error) {
    console.error('Error creating QC lot:', error)
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/qc/lots?id=uuid - Update QC lot
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admin and qaqc can update QC lots
    if (!['admin', 'qaqc'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const lotId = searchParams.get('id')
    
    if (!lotId) {
      return NextResponse.json({ error: 'QC Lot ID required' }, { status: 400 })
    }

    const body = await request.json()
    const lotData = createQcLotSchema.partial().parse(body)

    const updateData: any = { ...lotData }
    if (lotData.expireDate) {
      updateData.expireDate = new Date(lotData.expireDate).toISOString().split('T')[0]
    }
    if (lotData.effectiveFrom) {
      updateData.effectiveFrom = new Date(lotData.effectiveFrom).toISOString().split('T')[0]
    }
    if (lotData.effectiveTo) {
      updateData.effectiveTo = new Date(lotData.effectiveTo).toISOString().split('T')[0]
    }

    const [updatedLot] = await db
      .update(qcLots)
      .set(updateData)
      .where(eq(qcLots.id, lotId))
      .returning()

    if (!updatedLot) {
      return NextResponse.json({ error: 'QC Lot not found' }, { status: 404 })
    }

    return NextResponse.json(updatedLot)
  } catch (error) {
    console.error('Error updating QC lot:', error)
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/qc/lots?id=uuid - Hard delete QC lot (lots don't have isActive)
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admin can delete QC lots
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const lotId = searchParams.get('id')
    
    if (!lotId) {
      return NextResponse.json({ error: 'QC Lot ID required' }, { status: 400 })
    }

    // Check if lot is being used by any QC limits or runs
    // This should prevent deletion if lot is referenced
    
    const [deletedLot] = await db
      .delete(qcLots)
      .where(eq(qcLots.id, lotId))
      .returning()

    if (!deletedLot) {
      return NextResponse.json({ error: 'QC Lot not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, message: 'QC Lot deleted' })
  } catch (error) {
    console.error('Error deleting QC lot:', error)
    if (error instanceof Error && error.message.includes('foreign key')) {
      return NextResponse.json({ error: 'Cannot delete QC lot - it is being used by limits or runs' }, { status: 400 })
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}