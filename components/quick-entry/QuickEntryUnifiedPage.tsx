"use client"

import React, { useState, useCallback, useEffect, Suspense } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRouter, useSearchParams } from 'next/navigation'
import QuickEntryForm from '@/components/quick-entry/QuickEntryForm'
import { LeveyJenningsChart, QcRun } from '@/components/lj/LeveyJenningsChart'
import { EnhancedLjChart } from '@/components/lj/EnhancedLjChart'
import { Button } from '@/components/ui/button'

type QcLimits = {
  mean: number | string
  sd: number | string
  cv?: number | string
}

type Selection = {
  deviceId: string
  testId: string
  levelId: string
  lotId: string
}

function QuickEntryUnifiedInner() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Initialize selection from URL (if present)
  const [selection, setSelection] = useState<Selection | null>(() => {
    const deviceId = searchParams.get('deviceId')
    const testId = searchParams.get('testId')
    const levelId = searchParams.get('levelId')
    const lotId = searchParams.get('lotId')
    if (deviceId && testId && levelId && lotId) return { deviceId, testId, levelId, lotId }
    return null
  })

  // Limits pushed up from form when available
  const [limits, setLimits] = useState<QcLimits | null>(null)
  // Force form remount on external reset
  const [formResetKey, setFormResetKey] = useState(0)
  // Tab state persisted in URL
  const initialTab = (() => {
    const t = searchParams.get('tab')
    return t === 'chart' ? 'chart' : 'entry'
  })()
  const [activeTab, setActiveTab] = useState<'entry' | 'chart'>(initialTab)

  // Date range state (default last 30 days) reused for chart
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>(() => {
    const fromParam = searchParams.get('from')
    const toParam = searchParams.get('to')
    if (fromParam && toParam) return { from: fromParam, to: toParam }
    const today = new Date()
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
    return {
      from: thirtyDaysAgo.toISOString().split('T')[0],
      to: today.toISOString().split('T')[0],
    }
  })

  // Simple point count for the embedded chart (defaults from URL or 100)
  const [pointCount, setPointCount] = useState<number>(() => {
    const raw = searchParams.get('limit')
    const num = raw ? parseInt(raw, 10) : 100
    return Number.isFinite(num) ? Math.min(2000, Math.max(1, Math.floor(num))) : 100
  })

  // Sync URL with state
  const updateURL = useCallback(
    (
      newSelection: Selection | null,
      newDateRange?: { from: string; to: string },
      newPointCount?: number,
      newActiveTab?: 'entry' | 'chart'
    ) => {
      const params = new URLSearchParams()
      if (newSelection) {
        params.set('deviceId', newSelection.deviceId)
        params.set('testId', newSelection.testId)
        params.set('levelId', newSelection.levelId)
        params.set('lotId', newSelection.lotId)
      }
      const range = newDateRange || dateRange
      if (range?.from) params.set('from', range.from)
      if (range?.to) params.set('to', range.to)
      const limit = typeof newPointCount === 'number' ? newPointCount : pointCount
      params.set('limit', String(limit))
      const tab = newActiveTab || activeTab
      params.set('tab', tab)

      const paramString = params.toString()
      const newURL = paramString ? `?${paramString}` : ''
      router.replace(newURL || '?', { scroll: false })
    },
    [router, dateRange, pointCount, activeTab]
  )

  const handleSelectionChange = useCallback((newSelection: Selection) => {
    setSelection(newSelection)
    updateURL(newSelection)
  }, [updateURL])

  const handleLimitsChange = useCallback((newLimits: QcLimits | null) => {
    setLimits(newLimits)
  }, [])

  const handleClearSelection = useCallback(() => {
    setSelection(null)
    setLimits(null)
    updateURL(null)
    setFormResetKey((k) => k + 1)
  }, [updateURL])

  const handleDateChange = useCallback((from: string, to: string) => {
    setDateRange({ from, to })
    updateURL(selection, { from, to })
  }, [selection, updateURL])

  const handlePointCountChange = useCallback((cnt: number) => {
    const clamped = Math.min(2000, Math.max(1, Math.floor(cnt || 100)))
    setPointCount(clamped)
    updateURL(selection, undefined, clamped)
  }, [selection, updateURL])

  const switchTab = useCallback((tab: 'entry' | 'chart') => {
    setActiveTab(tab)
    updateURL(selection, undefined, undefined, tab)
  }, [selection, updateURL])

  // Fetch QC limits (fallback) in case limits not available from form yet
  const { data: fetchedLimits } = useQuery<{ mean: number; sd: number; cv?: number } | null>({
    queryKey: ['qc-limits', selection?.testId, selection?.levelId, selection?.lotId, selection?.deviceId],
    queryFn: async () => {
      if (!selection) return null
      const params = new URLSearchParams()
      params.append('testId', selection.testId)
      params.append('levelId', selection.levelId)
      params.append('lotId', selection.lotId)
      params.append('deviceId', selection.deviceId)
      params.append('active', 'true')
      const res = await fetch(`/api/qc/limits?${params}`)
      if (!res.ok) throw new Error('Failed to fetch QC limits')
      const data = await res.json()
      return Array.isArray(data) && data.length > 0 ? data[0] : null
    },
    enabled: !!selection,
  })

  // Resolve codes from selected IDs to enable Rolling-N proposal workflow
  const { data: devices } = useQuery<any[]>({
    queryKey: ['devices:list'],
    queryFn: () => fetch('/api/devices').then((r) => r.json()),
    enabled: !!selection,
  })
  const { data: tests } = useQuery<any[]>({
    queryKey: ['tests:list'],
    queryFn: () => fetch('/api/tests').then((r) => r.json()),
    enabled: !!selection,
  })
  const { data: levelsList } = useQuery<any[]>({
    queryKey: ['qc-levels:byTest', selection?.testId],
    queryFn: async () => {
      if (!selection?.testId) return []
      const res = await fetch(`/api/qc/levels?testId=${selection.testId}`)
      return res.ok ? res.json() : []
    },
    enabled: !!selection?.testId,
  })
  const { data: lotsList } = useQuery<any[]>({
    queryKey: ['qc-lots:byLevel', selection?.levelId],
    queryFn: async () => {
      if (!selection?.levelId) return []
      const res = await fetch(`/api/qc/lots?levelId=${selection.levelId}`)
      return res.ok ? res.json() : []
    },
    enabled: !!selection?.levelId,
  })

  const resolvedCodes = React.useMemo(() => {
    if (!selection) return null
    const device = devices?.find((d) => d.id === selection.deviceId)
    const test = tests?.find((t) => t.id === selection.testId)
    const level = levelsList?.find((lv) => lv.id === selection.levelId)
    const lot = lotsList?.find((lt) => lt.id === selection.lotId)
    if (!device || !test || !level || !lot) return null
    return {
      deviceCode: device.code as string,
      testCode: test.code as string,
      levelLabel: (level.level as 'L1' | 'L2' | 'L3') ?? 'L1',
      lotCode: lot.lotCode as string,
    }
  }, [selection, devices, tests, levelsList, lotsList])

  // Fetch QC runs for chart. Important: use the same query key family that cache updates target ('qc-runs', ...)
  const {
    data: chartData,
    isLoading: isRunsLoading,
    refetch: refetchRuns,
  } = useQuery<QcRun[]>({
    queryKey: ['qc-runs', selection?.deviceId, selection?.testId, selection?.levelId, selection?.lotId],
    queryFn: async () => {
      if (!selection) return []
      const params = new URLSearchParams()
      params.append('deviceId', selection.deviceId)
      params.append('testId', selection.testId)
      params.append('levelId', selection.levelId)
      params.append('lotId', selection.lotId)
      if (dateRange?.from) params.append('from', dateRange.from)
      if (dateRange?.to) params.append('to', dateRange.to)
      params.append('limit', String(pointCount))
      params.append('order', 'desc')
      const res = await fetch(`/api/qc/runs?${params}`)
      if (!res.ok) throw new Error('Failed to fetch QC runs data')
      const runs = await res.json()
      if (!Array.isArray(runs)) return []
      return runs.reverse() // ascending for plotting
    },
    enabled: !!selection,
  })

  // Count total runs for current filters (independent of limit)
  const { data: runsMeta } = useQuery<{ total: number } | null>({
    queryKey: ['chart-count', selection?.deviceId, selection?.testId, selection?.levelId, selection?.lotId, dateRange.from, dateRange.to],
    queryFn: async () => {
      if (!selection) return null
      const params = new URLSearchParams()
      params.append('deviceId', selection.deviceId)
      params.append('testId', selection.testId)
      params.append('levelId', selection.levelId)
      params.append('lotId', selection.lotId)
      if (dateRange?.from) params.append('from', dateRange.from)
      if (dateRange?.to) params.append('to', dateRange.to)
      params.append('includeCount', 'true')
      params.append('limit', '1')
      params.append('order', 'desc')

      const res = await fetch(`/api/qc/runs?${params}`)
      if (!res.ok) throw new Error('Failed to fetch QC runs count')
      const payload = await res.json()
      const total = typeof payload?.total === 'number' ? payload.total : (Array.isArray(payload) ? payload.length : 0)
      return { total }
    },
    enabled: !!selection,
  })

  // Refetch when date range or count changes (query key intentionally stable to align with cache updates)
  useEffect(() => {
    if (selection) {
      refetchRuns()
    }
  }, [selection, dateRange.from, dateRange.to, pointCount, refetchRuns])

  const effectiveLimits = fetchedLimits || limits

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Quick Entry - Nhập QC nhanh</h1>
          <p className="text-gray-600 mt-1">Giao diện nhập liệu QC và xem biểu đồ ngay bên dưới</p>
        </div>
        <div className="shrink-0">
          <Button variant="outline" onClick={handleClearSelection} aria-label="Làm mới">
            Làm mới
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg border shadow-sm p-2 w-full">
        <div className="flex gap-2">
          <button
            className={`px-3 py-2 rounded-md text-sm ${activeTab === 'entry' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            onClick={() => switchTab('entry')}
          >
            Nhập liệu
          </button>
          <button
            className={`px-3 py-2 rounded-md text-sm ${activeTab === 'chart' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            onClick={() => switchTab('chart')}
          >
            Biểu đồ L-J
          </button>
        </div>
      </div>

      {/* Quick Entry Form (keep mounted to preserve state across tabs) */}
      <div className={`bg-white rounded-lg border shadow-sm p-6 ${activeTab !== 'entry' ? 'hidden' : ''}`}>
        <QuickEntryForm
          key={formResetKey}
          onSelectionChange={handleSelectionChange}
          onLimitsChange={handleLimitsChange}
          onClearSelection={handleClearSelection}
          onSubmitSuccess={() => switchTab('chart')}
        />
      </div>

      {/* Inline date and limit controls for chart */}
      {activeTab === 'chart' && (
      <div className="bg-white rounded-lg border shadow-sm p-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Từ ngày</label>
            <input
              type="date"
              value={dateRange.from}
              onChange={(e) => handleDateChange(e.target.value, dateRange.to)}
              className="border rounded px-2 py-1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Đến ngày</label>
            <input
              type="date"
              value={dateRange.to}
              onChange={(e) => handleDateChange(dateRange.from, e.target.value)}
              className="border rounded px-2 py-1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Số điểm</label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={1}
                max={2000}
                step={1}
                value={pointCount}
                onChange={(e) => handlePointCountChange(parseInt(e.target.value || '100', 10))}
                className="border rounded px-2 py-1 w-28"
              />
              <span className="text-xs text-gray-500 whitespace-nowrap">
                (Có {runsMeta?.total ?? 0} điểm trong khoảng thời gian đã chọn. Đang hiển thị {chartData?.length ?? 0} điểm)
              </span>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Embedded LJ Chart */}
      {activeTab === 'chart' && (
      <div className="bg-white rounded-lg border shadow-sm p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Biểu đồ Levey-Jennings
            {effectiveLimits && (
              <span className="text-sm font-normal text-gray-600 ml-2">
                (Mean: {Number(effectiveLimits.mean)}, SD: {Number(effectiveLimits.sd)})
              </span>
            )}
          </h2>
        </div>

        {!selection ? (
          <div className="h-96 flex items-center justify-center text-gray-500">
            Vui lòng chọn thiết bị, xét nghiệm, mức và lô để xem biểu đồ.
          </div>
        ) : isRunsLoading ? (
          <div className="h-96 flex items-center justify-center text-gray-500">
            Đang tải dữ liệu biểu đồ...
          </div>
        ) : !chartData || chartData.length === 0 ? (
          <div className="h-96 flex items-center justify-center text-gray-500">
            Không có dữ liệu trong khoảng đã chọn.
          </div>
        ) : (
          resolvedCodes ? (
            <EnhancedLjChart
              runs={chartData}
              testCode={resolvedCodes.testCode}
              level={resolvedCodes.levelLabel}
              lotCode={resolvedCodes.lotCode}
              deviceCode={resolvedCodes.deviceCode}
              currentLimits={effectiveLimits ? { mean: Number(effectiveLimits.mean), sd: Number(effectiveLimits.sd), cv: effectiveLimits.cv ? Number(effectiveLimits.cv) : undefined, source: 'current' } : undefined}
              height={500}
            />
          ) : (
            <LeveyJenningsChart
              limits={effectiveLimits ? { mean: Number(effectiveLimits.mean), sd: Number(effectiveLimits.sd) } : undefined}
              runs={chartData}
              height={500}
            />
          )
        )}
      </div>
      )}
    </div>
  )
}

export default function QuickEntryUnifiedPage() {
  return (
    <Suspense fallback={<div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Quick Entry - Nhập QC nhanh</h1>
        <p className="text-gray-600 mt-1">Đang tải...</p>
      </div>
    </div>}>
      <QuickEntryUnifiedInner />
    </Suspense>
  )
}

