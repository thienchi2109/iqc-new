import { NextRequest } from 'next/server'
import { withAuth, type AuthUser } from '@/lib/auth/middleware'
import { getReportSummary } from '@/lib/query/reports'
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
  }
}

async function handler(request: NextRequest, user: AuthUser) {
  try {
    const filters = parseFilters(request)
    const summary = await getReportSummary(filters)
    // Audit viewing of report summary
    await AuditLogger.logReport(user, 'reports.summary', filters)
    return Response.json(summary)
  } catch (error) {
    console.error('reports.summary error', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export const GET = withAuth(handler, { permission: 'reports:read' })

