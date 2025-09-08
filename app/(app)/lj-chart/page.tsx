'use client'

import { useState, useCallback, useEffect, Suspense } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRouter, useSearchParams } from 'next/navigation'
import { LeveyJenningsChart, QcRun, QcLimits } from '@/components/lj/LeveyJenningsChart'
import CustomSelect from '@/components/ui/CustomSelect'
import { Input } from '@/components/ui/input'

interface QcLimit {
  mean: number
  sd: number
  cv: number
}

function LjChartPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Initialize state from URL parameters
  const [deviceId, setDeviceId] = useState(() => searchParams.get('deviceId') || '')
  const [testId, setTestId] = useState(() => searchParams.get('testId') || '')
  const [levelId, setLevelId] = useState(() => searchParams.get('levelId') || '')
  const [lotId, setLotId] = useState(() => searchParams.get('lotId') || '')
  const [pointCount, setPointCount] = useState(() => {
    const raw = searchParams.get('limit')
    const num = raw ? parseInt(raw, 10) : 100
    if (Number.isFinite(num)) {
      return Math.min(2000, Math.max(1, Math.floor(num)))
    }
    return 100
  })
  const [dateFrom, setDateFrom] = useState(() => {
    const param = searchParams.get('from')
    if (param) return param
    
    // Default to 30 days ago
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    return thirtyDaysAgo.toISOString().split('T')[0]
  })
  const [dateTo, setDateTo] = useState(() => {
    const param = searchParams.get('to')
    if (param) return param
    
    // Default to today
    return new Date().toISOString().split('T')[0]
  })

  // Update URL when filters change
  const updateURL = useCallback(() => {
    const params = new URLSearchParams()
    
    if (deviceId) params.set('deviceId', deviceId)
    if (testId) params.set('testId', testId)
    if (levelId) params.set('levelId', levelId)
    if (lotId) params.set('lotId', lotId)
    if (dateFrom) params.set('from', dateFrom)
    if (dateTo) params.set('to', dateTo)
    if (pointCount) params.set('limit', String(pointCount))
    
    const paramString = params.toString()
    const newURL = paramString ? `?${paramString}` : '/lj-chart'
    
    router.replace(newURL, { scroll: false })
  }, [router, deviceId, testId, levelId, lotId, dateFrom, dateTo, pointCount])

  // Update URL when any filter changes
  useEffect(() => {
    updateURL()
  }, [updateURL])

  // Fetch master data (same as QuickEntry)
  const { data: devices } = useQuery({
    queryKey: ['devices'],
    queryFn: async () => {
      const res = await fetch('/api/devices')
      if (!res.ok) throw new Error('Failed to fetch devices')
      const data = await res.json()
      return Array.isArray(data) ? data : []
    },
  })

  const { data: tests } = useQuery({
    queryKey: ['tests'],
    queryFn: async () => {
      const res = await fetch('/api/tests')
      if (!res.ok) throw new Error('Failed to fetch tests')
      const data = await res.json()
      return Array.isArray(data) ? data : []
    },
  })

  const { data: qcLevels } = useQuery({
    queryKey: ['qc-levels', testId],
    queryFn: async () => {
      const res = await fetch(`/api/qc/levels?testId=${testId}`)
      if (!res.ok) throw new Error('Failed to fetch QC levels')
      const data = await res.json()
      return Array.isArray(data) ? data : []
    },
    enabled: !!testId,
  })

  const { data: qcLots } = useQuery({
    queryKey: ['qc-lots', levelId],
    queryFn: async () => {
      const res = await fetch(`/api/qc/lots?levelId=${levelId}`)
      if (!res.ok) throw new Error('Failed to fetch QC lots')
      const data = await res.json()
      return Array.isArray(data) ? data : []
    },
    enabled: !!levelId,
  })

  // Fetch QC limits
  const { data: qcLimits } = useQuery<QcLimit | null>({
    queryKey: ['qc-limits', testId, levelId, lotId, deviceId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (testId) params.append('testId', testId)
      if (levelId) params.append('levelId', levelId)
      if (lotId) params.append('lotId', lotId)
      if (deviceId) params.append('deviceId', deviceId)
      
      const res = await fetch(`/api/qc/limits?${params}`)
      if (!res.ok) {
        throw new Error('Failed to fetch QC limits')
      }
      const data = await res.json()
      return Array.isArray(data) && data.length > 0 ? data[0] : null
    },
    enabled: !!(testId && levelId && lotId && deviceId),
  })

  // Count how many runs exist for current filters (independent of limit)
  const { data: runsMeta } = useQuery<{ total: number } | null>({
    queryKey: ['chart-count', deviceId, testId, levelId, lotId, dateFrom, dateTo],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (deviceId) params.append('deviceId', deviceId)
      if (testId) params.append('testId', testId)
      if (levelId) params.append('levelId', levelId)
      if (lotId) params.append('lotId', lotId)
      if (dateFrom) params.append('from', dateFrom)
      if (dateTo) params.append('to', dateTo)
      params.append('includeCount', 'true')
      params.append('limit', '1')
      params.append('order', 'desc')

      const res = await fetch(`/api/qc/runs?${params}`)
      if (!res.ok) {
        throw new Error('Failed to fetch QC runs count')
      }
      const payload = await res.json()
      const total = typeof payload?.total === 'number' ? payload.total : (Array.isArray(payload) ? payload.length : 0)
      return { total }
    },
    enabled: !!(deviceId && testId && levelId && lotId),
  })

  // Fetch QC runs data for chart
  const { data: chartData, isLoading } = useQuery<QcRun[]>({
    queryKey: ['chart-data', deviceId, testId, levelId, lotId, dateFrom, dateTo, pointCount],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (deviceId) params.append('deviceId', deviceId)
      if (testId) params.append('testId', testId)
      if (levelId) params.append('levelId', levelId)
      if (lotId) params.append('lotId', lotId)
      if (dateFrom) params.append('from', dateFrom)
      if (dateTo) params.append('to', dateTo)
      params.append('limit', String(Math.min(2000, Math.max(1, pointCount))))
      params.append('order', 'desc') // Get latest N, then reverse for plotting
      
      const res = await fetch(`/api/qc/runs?${params}`)
      if (!res.ok) {
        throw new Error('Failed to fetch QC runs data')
      }
      const runs = await res.json()
      
      if (!Array.isArray(runs)) {
        return []
      }
      // Reverse to oldest -> newest for LJ chart plotting
      return runs.reverse()
    },
    enabled: !!(deviceId && testId && levelId && lotId),
  })

  const mean = qcLimits?.mean || 0
  const sd = qcLimits?.sd || 0

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Biểu đồ Levey-Jennings</h1>
        <p className="text-gray-600 mt-1">Biểu đồ Levey-Jennings tương tác với quy tắc Westgard</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Bộ lọc biểu đồ</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Thiết bị *</label>
            <CustomSelect
              value={deviceId}
              onChange={(value) => setDeviceId(value)}
              options={devices?.map((device: any) => ({ value: device.id, label: `${device.code} - ${device.name}` })) || []}
              placeholder="Chọn thiết bị"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Xét nghiệm *</label>
            <CustomSelect
              value={testId}
              onChange={(value) => setTestId(value)}
              options={tests?.map((test: any) => ({ value: test.id, label: `${test.code} - ${test.name}` })) || []}
              placeholder="Chọn xét nghiệm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mức QC *</label>
            <CustomSelect
              value={levelId}
              onChange={(value) => setLevelId(value)}
              options={qcLevels?.map((level: any) => ({ value: level.id, label: `${level.level} - ${level.material}` })) || []}
              placeholder="Chọn mức"
              disabled={!testId}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Lô QC *</label>
            <CustomSelect
              value={lotId}
              onChange={(value) => setLotId(value)}
              options={qcLots?.map((lot: any) => ({ value: lot.id, label: `${lot.lotCode} (HSD: ${lot.expireDate})` })) || []}
              placeholder="Chọn lô"
              disabled={!levelId}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Từ ngày</label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Đến ngày</label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Số điểm hiển thị</label>
            <Input
              type="number"
              min={1}
              max={2000}
              step={1}
              value={pointCount}
              onChange={(e) => {
                const val = parseInt(e.target.value || '0', 10)
                const clamped = Math.min(2000, Math.max(1, Number.isFinite(val) ? val : 1))
                setPointCount(clamped)
              }}
            />
            <p className="text-xs text-gray-500 mt-1">
              Có {runsMeta?.total ?? 0} điểm trong khoảng ngày; hiển thị {chartData?.length ?? 0} điểm.
            </p>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Biểu đồ Levey-Jennings
            {qcLimits && (
              <span className="text-sm font-normal text-gray-600 ml-2">
                (Mean: {mean}, SD: {sd})
              </span>
            )}
          </h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            {/* Auto Result Colors */}
            <div>
              <p className="font-medium text-gray-700 mb-2">Kết quả tự động:</p>
              <div className="space-y-1">
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span>PASS</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span>WARN</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span>FAIL</span>
                </div>
              </div>
            </div>
            
            {/* Approval State Symbols */}
            <div>
              <p className="font-medium text-gray-700 mb-2">Trạng thái duyệt:</p>
              <div className="space-y-1">
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-white border-2 border-gray-400 rounded-full"></div>
                  <span>Chờ duyệt</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span>Đã duyệt</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-red-500 opacity-60 rounded-full"></div>
                  <span>Từ chối</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="h-96 flex items-center justify-center text-gray-500">
            Đang tải dữ liệu biểu đồ...
          </div>
        ) : !chartData || chartData.length === 0 ? (
          <div className="h-96 flex items-center justify-center text-gray-500">
            {deviceId && testId && levelId && lotId 
              ? "Không tìm thấy dữ liệu cho các bộ lọc đã chọn"
              : "Vui lòng chọn thiết bị, xét nghiệm, mức và lô để xem biểu đồ"
            }
          </div>
        ) : (
          <LeveyJenningsChart
            limits={qcLimits ? { mean: qcLimits.mean, sd: qcLimits.sd } : undefined}
            runs={chartData || []}
            height={500}
          />
        )}
      </div>
    </div>
  )
}

function LjChartWithSuspense() {
  return (
    <Suspense fallback={<div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Biểu đồ Levey-Jennings</h1>
        <p className="text-gray-600 mt-1">Đang tải...</p>
      </div>
    </div>}>
      <LjChartPage />
    </Suspense>
  )
}

export default LjChartWithSuspense
