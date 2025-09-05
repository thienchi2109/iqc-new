'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, ReferenceArea, Brush } from 'recharts'
import CustomSelect from '@/components/ui/CustomSelect'
import { Input } from '@/components/ui/Input'

interface ChartDataPoint {
  date: string
  value: number
  z: number
  status: 'accepted' | 'pending' | 'rejected'
  autoResult: 'pass' | 'warn' | 'fail'
  approvalState: 'pending' | 'approved' | 'rejected'
  violations: string[]
  performer: string
  performerName: string
  lotCode: string
  lotExpireDate: string
  runAtUtc: string
}

interface QcLimit {
  mean: number
  sd: number
  cv: number
}

export default function LjChart() {
  const [deviceId, setDeviceId] = useState('')
  const [testId, setTestId] = useState('')
  const [levelId, setLevelId] = useState('')
  const [lotId, setLotId] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

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

  // Fetch QC runs data for chart
  const { data: chartData, isLoading } = useQuery<ChartDataPoint[]>({
    queryKey: ['chart-data', deviceId, testId, levelId, lotId, dateFrom, dateTo],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (deviceId) params.append('deviceId', deviceId)
      if (testId) params.append('testId', testId)
      if (levelId) params.append('levelId', levelId)
      if (lotId) params.append('lotId', lotId)
      if (dateFrom) params.append('from', dateFrom)
      if (dateTo) params.append('to', dateTo)
      params.append('limit', '1000')
      
      const res = await fetch(`/api/qc/runs?${params}`)
      if (!res.ok) {
        throw new Error('Failed to fetch QC runs data')
      }
      const runs = await res.json()
      
      if (!Array.isArray(runs)) {
        return []
      }
      
      return runs.map((run: any) => ({
        date: new Date(run.runAt || run.createdAt).toLocaleDateString('vi-VN', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'Asia/Ho_Chi_Minh'
        }),
        value: Number(run.value) || 0,
        z: Number(run.z || 0),
        status: run.status || 'pending',
        autoResult: run.autoResult || 'pass',
        approvalState: run.approvalState || 'pending',
        violations: [], // TODO: Fetch violations
        performer: run.performerId || '',
        performerName: run.performerName || 'Unknown',
        lotCode: run.lotCode || 'Unknown',
        lotExpireDate: run.lotExpireDate || '',
        runAtUtc: run.runAt || run.createdAt || '',
      }))
    },
    enabled: !!(deviceId && testId && levelId && lotId),
  })

  const mean = qcLimits?.mean || 0
  const sd = qcLimits?.sd || 0

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as ChartDataPoint
      const autoResultColors = {
        pass: 'text-green-600',
        warn: 'text-yellow-600', 
        fail: 'text-red-600'
      }
      const approvalStateColors = {
        pending: 'text-orange-600',
        approved: 'text-green-600',
        rejected: 'text-red-600'
      }
      
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-2xl shadow-md max-w-sm">
          <p className="font-medium">{`Thời gian: ${label}`}</p>
          <p className="text-blue-600">{`Giá trị: ${data.value}`}</p>
          <p className="text-gray-600">{`Z-score: ${data.z != null && !isNaN(Number(data.z)) ? Number(data.z).toFixed(2) : 'N/A'}`}</p>
          
          <div className="flex justify-between mt-2">
            <p className={`text-sm ${autoResultColors[data.autoResult]}`}>
              Kết quả: {data.autoResult.toUpperCase()}
            </p>
            <p className={`text-sm ${approvalStateColors[data.approvalState]}`}>
              Duyệt: {data.approvalState === 'pending' ? 'Chờ' : 
                      data.approvalState === 'approved' ? 'Đã duyệt' : 'Từ chối'}
            </p>
          </div>
          
          <p className="text-sm text-gray-500 mt-1">Thực hiện: {data.performerName}</p>
          <p className="text-sm text-gray-500">Lô: {data.lotCode}</p>
          
          {data.violations.length > 0 && (
            <p className="text-red-600 text-sm mt-1">
              Vi phạm: {data.violations.join(', ')}
            </p>
          )}
        </div>
      )
    }
    return null
  }

  const CustomDot = (props: any) => {
    const { cx, cy, payload } = props
    
    // Colors based on auto_result
    const autoResultColors = {
      pass: '#10b981', // green
      warn: '#f59e0b',  // yellow
      fail: '#ef4444',  // red
    }
    
    // Hollow vs solid based on approval_state
    const isApproved = payload.approvalState === 'approved'
    const isRejected = payload.approvalState === 'rejected'
    const isPending = payload.approvalState === 'pending'
    
    const color = autoResultColors[payload.autoResult as keyof typeof autoResultColors] || '#6b7280'
    
    return (
      <circle
        cx={cx}
        cy={cy}
        r={5}
        fill={isPending ? 'white' : color} // Hollow for pending, solid for approved/rejected
        stroke={color}
        strokeWidth={isPending ? 2 : 1}
        opacity={isRejected ? 0.6 : 1} // Slightly transparent if rejected
      />
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Biểu đồ Levey-Jennings</h1>
        <p className="text-gray-600 mt-1">Biểu đồ L-J tương tác với quy tắc Westgard</p>
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Biểu đồ L-J
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
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis domain={['dataMin - 0.5', 'dataMax + 0.5']} />
              
              {/* Reference lines for mean and SD */}
              {qcLimits && (
                <>
                  <ReferenceArea 
                    y1={mean - 3 * sd} 
                    y2={mean + 3 * sd} 
                    fill="#ef4444" 
                    fillOpacity={0.1} 
                  />
                  <ReferenceLine y={mean} stroke="#374151" strokeDasharray="4 2" />
                  <ReferenceLine y={mean + sd} stroke="#6b7280" strokeDasharray="2 2" />
                  <ReferenceLine y={mean - sd} stroke="#6b7280" strokeDasharray="2 2" />
                  <ReferenceLine y={mean + 2 * sd} stroke="#f59e0b" strokeDasharray="2 2" />
                  <ReferenceLine y={mean - 2 * sd} stroke="#f59e0b" strokeDasharray="2 2" />
                  <ReferenceLine y={mean + 3 * sd} stroke="#ef4444" strokeDasharray="2 2" />
                  <ReferenceLine y={mean - 3 * sd} stroke="#ef4444" strokeDasharray="2 2" />
                </>
              )}
              
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke="#2563eb" 
                strokeWidth={2}
                dot={<CustomDot />}
                connectNulls={false}
              />
              
              <Tooltip content={<CustomTooltip />} />
              <Brush dataKey="date" height={30} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
