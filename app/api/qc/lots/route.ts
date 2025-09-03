import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'
import { db } from '@/lib/db/client'
import { qcLots } from '@/lib/db/schema'
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

    let query = db.select().from(qcLots)
    
    if (levelIds.length > 0) {
      query = query.where(inArray(qcLots.levelId, levelIds)) as typeof query
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