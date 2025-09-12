import { and, between, count, desc, eq, gte, lte, sql } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { qcRuns, violations, runGroups, tests, devices, qcLevels, qcLots } from '@/lib/db/schema'

export interface ReportFilters {
  from?: string
  to?: string
  deviceId?: string
  testId?: string
  levelId?: string
  lotId?: string
}

export interface ReportSummary {
  totalRuns: number
  acceptedRuns: number
  rejectedRuns: number
  warningRuns: number
  acceptanceRate: number
  rejectionRate: number
}

function buildDateRange(where: any[], from?: string, to?: string) {
  if (from) {
    where.push(gte(qcRuns.createdAt, new Date(from)))
  }
  if (to) {
    where.push(lte(qcRuns.createdAt, new Date(to)))
  }
}

function buildCommonWhere(filters: ReportFilters) {
  const where: any[] = []
  buildDateRange(where, filters.from, filters.to)
  if (filters.deviceId) where.push(eq(qcRuns.deviceId, filters.deviceId))
  if (filters.testId) where.push(eq(qcRuns.testId, filters.testId))
  if (filters.levelId) where.push(eq(qcRuns.levelId, filters.levelId))
  if (filters.lotId) where.push(eq(qcRuns.lotId, filters.lotId))
  return where
}

export async function getReportSummary(filters: ReportFilters): Promise<ReportSummary> {
  const where = buildCommonWhere(filters)

  const [total, accepted, rejected, warn] = await Promise.all([
    db.select({ c: count() }).from(qcRuns).where(and(...where)),
    db
      .select({ c: count() })
      .from(qcRuns)
      .where(and(...[...where, eq(qcRuns.status, 'accepted')])),
    db
      .select({ c: count() })
      .from(qcRuns)
      .where(and(...[...where, eq(qcRuns.status, 'rejected')])),
    db
      .select({ c: count() })
      .from(qcRuns)
      .where(and(...[...where, eq(qcRuns.autoResult, 'warn')])),
  ])

  const totalRuns = Number(total[0]?.c ?? 0)
  const acceptedRuns = Number(accepted[0]?.c ?? 0)
  const rejectedRuns = Number(rejected[0]?.c ?? 0)
  const warningRuns = Number(warn[0]?.c ?? 0)
  const acceptanceRate = totalRuns ? (acceptedRuns / totalRuns) * 100 : 0
  const rejectionRate = totalRuns ? (rejectedRuns / totalRuns) * 100 : 0

  return { totalRuns, acceptedRuns, rejectedRuns, warningRuns, acceptanceRate, rejectionRate }
}

export interface LjPoint {
  runId: string
  at: Date
  value: number
  z: number | null
  status: 'pending' | 'accepted' | 'rejected'
  autoResult: 'pass' | 'warn' | 'fail' | null
}

export async function getLJSeries(filters: ReportFilters): Promise<LjPoint[]> {
  const where = buildCommonWhere(filters)
  const rows = await db
    .select({
      runId: qcRuns.id,
      at: runGroups.runAt,
      createdAt: qcRuns.createdAt,
      value: qcRuns.value,
      z: qcRuns.z,
      status: qcRuns.status,
      autoResult: qcRuns.autoResult,
    })
    .from(qcRuns)
    .leftJoin(runGroups, eq(runGroups.id, qcRuns.groupId))
    .where(and(...where))
    .orderBy(desc(qcRuns.createdAt))

  return rows.map(r => ({
    runId: r.runId,
    at: r.at ?? r.createdAt!,
    value: Number(r.value),
    z: r.z !== null && r.z !== undefined ? Number(r.z) : null,
    status: r.status as LjPoint['status'],
    autoResult: (r.autoResult as LjPoint['autoResult']) ?? null,
  }))
}

export interface ViolationsSummaryItem {
  ruleCode: string
  count: number
}

export async function getViolationsSummary(filters: ReportFilters): Promise<ViolationsSummaryItem[]> {
  const where = buildCommonWhere(filters)
  // Join to violations then group by ruleCode
  const rows = await db
    .select({ ruleCode: violations.ruleCode, c: count() })
    .from(violations)
    .leftJoin(qcRuns, eq(qcRuns.id, violations.runId))
    .where(and(...where))
    .groupBy(violations.ruleCode)

  return rows.map(r => ({ ruleCode: r.ruleCode!, count: Number(r.c) }))
}

export interface RunsPageItem {
  id: string
  at: Date
  value: number
  z: number | null
  status: 'pending' | 'accepted' | 'rejected'
  autoResult: 'pass' | 'warn' | 'fail' | null
  deviceName?: string
  testName?: string
  level?: string
  lotCode?: string
}

export async function getRunsPage(filters: ReportFilters, page = 1, pageSize = 25) {
  const where = buildCommonWhere(filters)
  const offset = (page - 1) * pageSize

  const data = await db
    .select({
      id: qcRuns.id,
      at: runGroups.runAt,
      createdAt: qcRuns.createdAt,
      value: qcRuns.value,
      z: qcRuns.z,
      status: qcRuns.status,
      autoResult: qcRuns.autoResult,
      deviceName: devices.name,
      testName: tests.name,
      level: qcLevels.level,
      lotCode: qcLots.lotCode,
    })
    .from(qcRuns)
    .leftJoin(runGroups, eq(runGroups.id, qcRuns.groupId))
    .leftJoin(devices, eq(devices.id, qcRuns.deviceId))
    .leftJoin(tests, eq(tests.id, qcRuns.testId))
    .leftJoin(qcLevels, eq(qcLevels.id, qcRuns.levelId))
    .leftJoin(qcLots, eq(qcLots.id, qcRuns.lotId))
    .where(and(...where))
    .orderBy(desc(qcRuns.createdAt))
    .limit(pageSize)
    .offset(offset)

  const totalRows = await db.select({ c: count() }).from(qcRuns).where(and(...where))
  const total = Number(totalRows[0]?.c ?? 0)

  const items: RunsPageItem[] = data.map(r => ({
    id: r.id,
    at: r.at ?? r.createdAt!,
    value: Number(r.value),
    z: r.z !== null && r.z !== undefined ? Number(r.z) : null,
    status: r.status as RunsPageItem['status'],
    autoResult: (r.autoResult as RunsPageItem['autoResult']) ?? null,
    deviceName: r.deviceName ?? undefined,
    testName: r.testName ?? undefined,
    level: r.level ?? undefined,
    lotCode: r.lotCode ?? undefined,
  }))

  return {
    data: items,
    meta: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  }
}

