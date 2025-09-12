import { NextRequest } from 'next/server'
import { withAuth, type AuthUser } from '@/lib/auth/middleware'
import { getLimitsHistory } from '@/lib/query/reports'
import { AuditLogger } from '@/lib/audit/logger'

async function handler(request: NextRequest, user: AuthUser) {
  try {
    const { searchParams } = new URL(request.url)
    const testId = searchParams.get('testId') || undefined
    const levelId = searchParams.get('levelId') || undefined
    const lotId = searchParams.get('lotId') || undefined
    const deviceId = searchParams.get('deviceId') || undefined

    if (!testId || !levelId || !lotId || !deviceId) {
      return Response.json({ data: [], error: 'Missing required filters' }, { status: 200 })
    }

    const data = await getLimitsHistory({ testId, levelId, lotId, deviceId })
    await AuditLogger.logReport(user, 'reports.limits-history', { testId, levelId, lotId, deviceId })
    return Response.json({ data })
  } catch (error) {
    console.error('reports.limits-history error', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export const GET = withAuth(handler, { permission: 'reports:read' })

