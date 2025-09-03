import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'
import { db } from '@/lib/db/client'
import { tests } from '@/lib/db/schema'
import { createTestSchema, updateTestSchema } from '@/lib/qc/validation'
import { eq } from 'drizzle-orm'

// GET /api/tests - Get all tests
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const isActive = searchParams.get('isActive')

    let query = db.select().from(tests)
    
    if (isActive !== null) {
      query = query.where(eq(tests.isActive, isActive === 'true')) as typeof query
    }

    const allTests = await query.orderBy(tests.name)

    return NextResponse.json(allTests)
  } catch (error) {
    console.error('Error fetching tests:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/tests - Create new test
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admin and qaqc can create tests
    if (!['admin', 'qaqc'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const testData = createTestSchema.parse(body)

    const [newTest] = await db
      .insert(tests)
      .values(testData)
      .returning()

    return NextResponse.json(newTest)
  } catch (error) {
    console.error('Error creating test:', error)
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}