import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'
import { db } from '@/lib/db/client'
import { units } from '@/lib/db/schema'
import { createUnitSchema } from '@/lib/qc/validation'
import { eq } from 'drizzle-orm'

// GET /api/units - Get all units
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const allUnits = await db.select().from(units).orderBy(units.display)

    return NextResponse.json(allUnits)
  } catch (error) {
    console.error('Error fetching units:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/units - Create new unit
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admin and qaqc can create units
    if (!['admin', 'qaqc'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const unitData = createUnitSchema.parse(body)

    const [newUnit] = await db
      .insert(units)
      .values(unitData)
      .returning()

    return NextResponse.json(newUnit)
  } catch (error) {
    console.error('Error creating unit:', error)
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/units?id=uuid - Update unit
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admin and qaqc can update units
    if (!['admin', 'qaqc'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const unitId = searchParams.get('id')
    
    if (!unitId) {
      return NextResponse.json({ error: 'Unit ID required' }, { status: 400 })
    }

    const body = await request.json()
    const unitData = createUnitSchema.parse(body) // Units don't have partial update schema

    const [updatedUnit] = await db
      .update(units)
      .set(unitData)
      .where(eq(units.id, unitId))
      .returning()

    if (!updatedUnit) {
      return NextResponse.json({ error: 'Unit not found' }, { status: 404 })
    }

    return NextResponse.json(updatedUnit)
  } catch (error) {
    console.error('Error updating unit:', error)
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/units?id=uuid - Hard delete unit (units don't have isActive)
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admin can delete units
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const unitId = searchParams.get('id')
    
    if (!unitId) {
      return NextResponse.json({ error: 'Unit ID required' }, { status: 400 })
    }

    // Check if unit is being used by any tests
    // This should be implemented to prevent deletion of units in use
    // For now, we'll allow deletion but in production this should check foreign key constraints
    
    const [deletedUnit] = await db
      .delete(units)
      .where(eq(units.id, unitId))
      .returning()

    if (!deletedUnit) {
      return NextResponse.json({ error: 'Unit not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, message: 'Unit deleted' })
  } catch (error) {
    console.error('Error deleting unit:', error)
    if (error instanceof Error && error.message.includes('foreign key')) {
      return NextResponse.json({ error: 'Cannot delete unit - it is being used by tests' }, { status: 400 })
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}