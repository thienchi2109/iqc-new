import { NextRequest } from 'next/server'
import { withAuth, type AuthUser } from '@/lib/auth/middleware'
import { getRunsPage } from '@/lib/query/reports'
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
    const { searchParams } = new URL(request.url)
    const filters = parseFilters(request)
    const page = Number(searchParams.get('page') || 1)
    const pageSize = Number(searchParams.get('pageSize') || 25)
    const format = searchParams.get('format') || 'json'

    const result = await getRunsPage(filters, page, pageSize)

    if (format === 'csv') {
      const headers = ['id','at','value','z','status','autoResult','device','test','level','lot']
      const rows = result.data.map(r => [
        r.id,
        r.at.toISOString(),
        r.value,
        r.z ?? '',
        r.status,
        r.autoResult ?? '',
        r.deviceName ?? '',
        r.testName ?? '',
        r.level ?? '',
        r.lotCode ?? '',
      ])
      const csv = [headers.join(','), ...rows.map(x => x.join(','))].join('\n')
      await AuditLogger.logExport(user, 'reports.runs.csv', filters, result.data.length, { page, pageSize })
      return new Response(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="qc_runs.csv"',
        },
      })
    }

    await AuditLogger.logReport(user, 'reports.runs', { ...filters, page, pageSize })
    return Response.json(result)
  } catch (error) {
    console.error('reports.runs error', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export const GET = withAuth(handler, { permission: 'reports:read' })

