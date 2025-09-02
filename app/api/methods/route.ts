import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'
import { db } from '@/lib/db/client'
import { methods } from '@/lib/db/schema'
import { createMethodSchema } from '@/lib/qc/validation'

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