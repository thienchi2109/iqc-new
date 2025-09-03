import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'
import { db } from '@/lib/db/client'
import { qcLevels } from '@/lib/db/schema'
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

    let query = db.select().from(qcLevels)
    
    if (testId) {
      query = query.where(eq(qcLevels.testId, testId)) as typeof query
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