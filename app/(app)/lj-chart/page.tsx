'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, ReferenceArea, Brush } from 'recharts'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

interface ChartDataPoint {
  date: string
  value: number
  z: number
  status: 'accepted' | 'pending' | 'rejected'
  violations: string[]
  performer: string
  lotCode: string
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
    queryFn: () => fetch('/api/devices').then(res => res.json()),
  })

  const { data: tests } = useQuery({
    queryKey: ['tests'],
    queryFn: () => fetch('/api/tests').then(res => res.json()),
  })

  const { data: qcLevels } = useQuery({
    queryKey: ['qc-levels', testId],
    queryFn: () => fetch(`/api/qc/levels?testId=${testId}`).then(res => res.json()),
    enabled: !!testId,
  })

  const { data: qcLots } = useQuery({
    queryKey: ['qc-lots', levelId],
    queryFn: () => fetch(`/api/qc/lots?levelId=${levelId}`).then(res => res.json()),
    enabled: !!levelId,
  })

  // Fetch QC limits
  const { data: qcLimits } = useQuery<QcLimit>({
    queryKey: ['qc-limits', testId, levelId, lotId, deviceId],
    queryFn: () => {
      const params = new URLSearchParams()
      if (testId) params.append('testId', testId)
      if (levelId) params.append('levelId', levelId)
      if (lotId) params.append('lotId', lotId)
      if (deviceId) params.append('deviceId', deviceId)
      return fetch(`/api/qc/limits?${params}`).then(res => res.json()).then(data => data[0])
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
      
      const runs = await fetch(`/api/qc/runs?${params}`).then(res => res.json())
      
      return runs.map((run: any) => ({
        date: new Date(run.createdAt).toLocaleDateString(),
        value: Number(run.value),
        z: Number(run.z || 0),
        status: run.status,
        violations: [], // TODO: Fetch violations
        performer: run.performerId,
        lotCode: run.lotId,
      }))
    },
    enabled: !!(deviceId && testId && levelId && lotId),
  })

  const mean = qcLimits?.mean || 0
  const sd = qcLimits?.sd || 0

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as ChartDataPoint
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-2xl shadow-md">
          <p className="font-medium">{`Date: ${label}`}</p>
          <p className="text-blue-600">{`Value: ${data.value}`}</p>
          <p className="text-gray-600">{`Z-score: ${data.z.toFixed(2)}`}</p>
          <p className={`font-medium ${
            data.status === 'accepted' ? 'text-green-600' :
            data.status === 'pending' ? 'text-yellow-600' : 'text-red-600'
          }`}>
            Status: {data.status}
          </p>
          {data.violations.length > 0 && (
            <p className="text-red-600 text-sm">
              Violations: {data.violations.join(', ')}
            </p>
          )}
        </div>
      )
    }
    return null
  }

  const CustomDot = (props: any) => {
    const { cx, cy, payload } = props
    const colors = {
      accepted: '#10b981', // green
      pending: '#f59e0b',  // yellow
      rejected: '#ef4444', // red
    }
    
    return (
      <circle
        cx={cx}
        cy={cy}
        r={4}
        fill={colors[payload.status as keyof typeof colors] || '#6b7280'}
        stroke="white"
        strokeWidth={1}
      />
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Levey-Jennings Charts</h1>
        <p className="text-gray-600 mt-1">
          Interactive L-J charts with Westgard rule visualization
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Chart Filters</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Device *
            </label>
            <Select value={deviceId} onChange={(e) => setDeviceId(e.target.value)}>
              <option value="">Select Device</option>
              {devices?.map((device: any) => (
                <option key={device.id} value={device.id}>
                  {device.code} - {device.name}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Test *
            </label>
            <Select value={testId} onChange={(e) => setTestId(e.target.value)}>
              <option value="">Select Test</option>
              {tests?.map((test: any) => (
                <option key={test.id} value={test.id}>
                  {test.code} - {test.name}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              QC Level *
            </label>
            <Select value={levelId} onChange={(e) => setLevelId(e.target.value)} disabled={!testId}>
              <option value="">Select Level</option>
              {qcLevels?.map((level: any) => (
                <option key={level.id} value={level.id}>
                  {level.level} - {level.material}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              QC Lot *
            </label>
            <Select value={lotId} onChange={(e) => setLotId(e.target.value)} disabled={!levelId}>
              <option value="">Select Lot</option>
              {qcLots?.map((lot: any) => (
                <option key={lot.id} value={lot.id}>
                  {lot.lotCode} (Exp: {lot.expireDate})
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              From Date
            </label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              To Date
            </label>
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
            L-J Chart
            {qcLimits && (
              <span className="text-sm font-normal text-gray-600 ml-2">
                (Mean: {mean}, SD: ±{sd})
              </span>
            )}
          </h2>
          <div className="flex space-x-4 text-sm">
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span>Accepted</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <span>Warning</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span>Rejected</span>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="h-96 flex items-center justify-center text-gray-500">
            Loading chart data...
          </div>
        ) : !chartData || chartData.length === 0 ? (
          <div className="h-96 flex items-center justify-center text-gray-500">
            {deviceId && testId && levelId && lotId 
              ? 'No data found for the selected filters'
              : 'Please select device, test, level, and lot to view chart'
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