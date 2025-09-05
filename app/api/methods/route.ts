import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'
import { db } from '@/lib/db/client'
import { methods } from '@/lib/db/schema'
import { createMethodSchema } from '@/lib/qc/validation'
import { eq } from 'drizzle-orm'

// GET /api/methods - Get all methods
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const allMethods = await db.select().from(methods).orderBy(methods.name)

    return NextResponse.json(allMethods)
  } catch (error) {
    console.error('Error fetching methods:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/methods - Create new method
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admin and qaqc can create methods
    if (!['admin', 'qaqc'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const methodData = createMethodSchema.parse(body)

    const [newMethod] = await db
      .insert(methods)
      .values(methodData)
      .returning()

    return NextResponse.json(newMethod)
  } catch (error) {
    console.error('Error creating method:', error)
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/methods?id=uuid - Update method
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admin and qaqc can update methods
    if (!['admin', 'qaqc'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const methodId = searchParams.get('id')
    
    if (!methodId) {
      return NextResponse.json({ error: 'Method ID required' }, { status: 400 })
    }

    const body = await request.json()
    const methodData = createMethodSchema.parse(body) // Methods don't have partial update schema

    const [updatedMethod] = await db
      .update(methods)
      .set(methodData)
      .where(eq(methods.id, methodId))
      .returning()

    if (!updatedMethod) {
      return NextResponse.json({ error: 'Method not found' }, { status: 404 })
    }

    return NextResponse.json(updatedMethod)
  } catch (error) {
    console.error('Error updating method:', error)
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/methods?id=uuid - Hard delete method (methods don't have isActive)
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admin can delete methods
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const methodId = searchParams.get('id')
    
    if (!methodId) {
      return NextResponse.json({ error: 'Method ID required' }, { status: 400 })
    }

    // Check if method is being used by any tests
    // This should be implemented to prevent deletion of methods in use
    
    const [deletedMethod] = await db
      .delete(methods)
      .where(eq(methods.id, methodId))
      .returning()

    if (!deletedMethod) {
      return NextResponse.json({ error: 'Method not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, message: 'Method deleted' })
  } catch (error) {
    console.error('Error deleting method:', error)
    if (error instanceof Error && error.message.includes('foreign key')) {
      return NextResponse.json({ error: 'Cannot delete method - it is being used by tests' }, { status: 400 })
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}