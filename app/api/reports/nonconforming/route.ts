import { NextRequest } from 'next/server'
import { withAuth, type AuthUser } from '@/lib/auth/middleware'
import { getNonconformingLog } from '@/lib/query/reports'
import { AuditLogger } from '@/lib/audit/logger'

function parseFilters(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  return {
    from: searchParams.get('from') || undefined,
    to: searchParams.get('to') || undefined,
    deviceId: searchParams.get('deviceId') || undefined,
    testId: searchParams.get('testId') || undefined,
    levelId: searchParams.get('levelId') || undefined,
    lotId: searchParams.get('lotId') || undefined,
    page: Number(searchParams.get('page') || 1),
    pageSize: Number(searchParams.get('pageSize') || 25),
  }
}

async function handler(request: NextRequest, user: AuthUser) {
  try {
    const { page, pageSize, ...filters } = parseFilters(request)
    const data = await getNonconformingLog(filters, page, pageSize)
    await AuditLogger.logReport(user, 'reports.nonconforming', { ...filters, page, pageSize })
    return Response.json(data)
  } catch (error) {
    console.error('reports.nonconforming error', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export const GET = withAuth(handler, { permission: 'reports:read' })

