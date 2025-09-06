'use client'

import React from 'react'
import {
  ResponsiveContainer,
  ScatterChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Scatter,
  ReferenceLine,
  Tooltip,
  Legend,
} from 'recharts'
import { GhostPoint } from './useGhostPoints'

export interface QcRun {
  id: string
  value: number
  z: number | null
  side?: 'above' | 'below' | 'on'
  runAt: string
  autoResult?: string
  approvalState?: string
  violations?: string[]
  performerName?: string
  lotCode?: string
  notes?: string
}

export interface QcLimits {
  mean: number
  sd: number
  cv?: number
}

export interface LjPanelProps {
  deviceId?: string
  testId?: string
  levelId?: string
  lotId?: string
  dateRange?: { from: Date; to: Date }
  limits?: QcLimits
  ghostPoints?: GhostPoint[]
  runs?: QcRun[]
  isLoading?: boolean
  title?: string
  className?: string
}

interface ChartDataPoint {
  x: number // Sequential run number or timestamp
  value: number
  z: number | null
  date: string
  formattedDate: string
  type: 'real' | 'ghost'
  color?: string
  runData?: QcRun
  ghostData?: GhostPoint
}

/**
 * LjPanel - Levey-Jennings chart component with ghost points support
 * Renders both persisted QC runs and real-time ghost points
 */
export function LjPanel({
  deviceId,
  testId,
  levelId,
  lotId,
  dateRange,
  limits,
  ghostPoints = [],
  runs = [],
  isLoading = false,
  title = 'Biểu đồ Levey-Jennings',
  className = '',
}: LjPanelProps) {
  // Format date to Vietnamese format
  const formatDate = (date: string | Date): string => {
    const d = typeof date === 'string' ? new Date(date) : date
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Ho_Chi_Minh',
    }).format(d)
  }

  // Prepare chart data by combining real runs and ghost points
  const chartData = React.useMemo((): ChartDataPoint[] => {
    const data: ChartDataPoint[] = []

    // Add real runs
    runs.forEach((run, index) => {
      data.push({
        x: index + 1,
        value: run.value,
        z: run.z,
        date: run.runAt,
        formattedDate: formatDate(run.runAt),
        type: 'real',
        runData: run,
      })
    })

    // Add ghost points
    ghostPoints.forEach((ghost, index) => {
      data.push({
        x: runs.length + index + 1, // Position after real runs
        value: ghost.value,
        z: ghost.z,
        date: ghost.time.toISOString(),
        formattedDate: formatDate(ghost.time),
        type: 'ghost',
        color: ghost.color,
        ghostData: ghost,
      })
    })

    return data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }, [runs, ghostPoints])

  // Separate data for real and ghost points
  const realPoints = chartData.filter(d => d.type === 'real')
  const ghostPointsData = chartData.filter(d => d.type === 'ghost')

  // Calculate chart bounds
  const yMin = limits ? limits.mean - 4 * limits.sd : Math.min(...chartData.map(d => d.value)) - 10
  const yMax = limits ? limits.mean + 4 * limits.sd : Math.max(...chartData.map(d => d.value)) + 10

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null

    const data = payload[0].payload as ChartDataPoint
    const isGhost = data.type === 'ghost'

    return (
      <div className="bg-white p-3 border border-gray-300 rounded-lg shadow-lg">
        <p className="font-semibold text-sm">
          {isGhost ? 'Ghost Point' : 'QC Run'} #{label}
        </p>
        <p className="text-sm">
          <span className="font-medium">Giá trị:</span> {data.value.toFixed(3)}
        </p>
        {data.z !== null && (
          <p className="text-sm">
            <span className="font-medium">Z-score:</span> {data.z.toFixed(3)}
          </p>
        )}
        <p className="text-sm">
          <span className="font-medium">Thời gian:</span> {data.formattedDate}
        </p>
        
        {!isGhost && data.runData && (
          <>
            {data.runData.autoResult && (
              <p className="text-sm">
                <span className="font-medium">Kết quả:</span> {data.runData.autoResult}
              </p>
            )}
            {data.runData.approvalState && (
              <p className="text-sm">
                <span className="font-medium">Trạng thái:</span> {data.runData.approvalState}
              </p>
            )}
            {data.runData.performerName && (
              <p className="text-sm">
                <span className="font-medium">Người thực hiện:</span> {data.runData.performerName}
              </p>
            )}
            {data.runData.lotCode && (
              <p className="text-sm">
                <span className="font-medium">Lô:</span> {data.runData.lotCode}
              </p>
            )}
            {data.runData.violations && data.runData.violations.length > 0 && (
              <div className="text-sm">
                <span className="font-medium text-red-600">Vi phạm:</span>
                <ul className="list-disc list-inside ml-2">
                  {data.runData.violations.map((violation, idx) => (
                    <li key={idx} className="text-red-600">{violation}</li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}

        {isGhost && (
          <p className="text-sm text-gray-500 italic">
            Điểm tạm thời - chưa lưu
          </p>
        )}
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className={`bg-white rounded-2xl shadow-md border border-gray-200 p-6 ${className}`}>
        <div className="flex items-center justify-center h-96">
          <div className="text-gray-500">Đang tải dữ liệu...</div>
        </div>
      </div>
    )
  }

  if (!limits) {
    return (
      <div className={`bg-white rounded-2xl shadow-md border border-gray-200 p-6 ${className}`}>
        <div className="flex items-center justify-center h-96">
          <div className="text-gray-500">Chọn thiết bị, xét nghiệm, mức và lô để xem biểu đồ</div>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-2xl shadow-md border border-gray-200 p-6 ${className}`}>
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        {limits && (
          <div className="text-sm text-gray-600 mt-1">
            Mean: {limits.mean.toFixed(3)} | SD: {limits.sd.toFixed(3)} 
            {limits.cv && ` | CV: ${limits.cv.toFixed(2)}%`}
          </div>
        )}
      </div>

      <div className="h-96">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart
            data={chartData}
            margin={{ top: 20, right: 30, bottom: 20, left: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            
            <XAxis
              type="number"
              dataKey="x"
              domain={['dataMin', 'dataMax']}
              tickFormatter={(value) => `#${Math.round(value)}`}
              stroke="#6b7280"
            />
            
            <YAxis
              type="number"
              domain={[yMin, yMax]}
              tickFormatter={(value) => value.toFixed(1)}
              stroke="#6b7280"
            />

            <Tooltip content={<CustomTooltip />} />
            
            <Legend />

            {/* Reference lines for statistical limits */}
            {limits && (
              <>
                {/* Mean line */}
                <ReferenceLine
                  y={limits.mean}
                  stroke="#059669"
                  strokeWidth={2}
                  strokeDasharray="none"
                  label={{ value: "Mean", position: "right" }}
                />
                
                {/* ±1SD lines */}
                <ReferenceLine
                  y={limits.mean + limits.sd}
                  stroke="#0ea5e9"
                  strokeWidth={1}
                  strokeDasharray="3 3"
                  label={{ value: "+1SD", position: "right" }}
                />
                <ReferenceLine
                  y={limits.mean - limits.sd}
                  stroke="#0ea5e9"
                  strokeWidth={1}
                  strokeDasharray="3 3"
                  label={{ value: "-1SD", position: "right" }}
                />
                
                {/* ±2SD lines */}
                <ReferenceLine
                  y={limits.mean + 2 * limits.sd}
                  stroke="#f59e0b"
                  strokeWidth={1}
                  strokeDasharray="5 5"
                  label={{ value: "+2SD", position: "right" }}
                />
                <ReferenceLine
                  y={limits.mean - 2 * limits.sd}
                  stroke="#f59e0b"
                  strokeWidth={1}
                  strokeDasharray="5 5"
                  label={{ value: "-2SD", position: "right" }}
                />
                
                {/* ±3SD lines */}
                <ReferenceLine
                  y={limits.mean + 3 * limits.sd}
                  stroke="#ef4444"
                  strokeWidth={2}
                  strokeDasharray="none"
                  label={{ value: "+3SD", position: "right" }}
                />
                <ReferenceLine
                  y={limits.mean - 3 * limits.sd}
                  stroke="#ef4444"
                  strokeWidth={2}
                  strokeDasharray="none"
                  label={{ value: "-3SD", position: "right" }}
                />
              </>
            )}

            {/* Real points series */}
            <Scatter
              name="Điểm đã lưu"
              dataKey="value"
              data={realPoints}
              fill="#3b82f6"
              stroke="#2563eb"
              strokeWidth={2}
            />

            {/* Ghost points series - hollow dots with dashed stroke */}
            <Scatter
              name="Điểm tạm thời"
              dataKey="value"
              data={ghostPointsData}
              fill="none"
              stroke="#ef4444"
              strokeWidth={2}
              strokeDasharray="5,5"
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* Chart info and hints */}
      <div className="mt-4 text-sm text-gray-600">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span>Điểm đã lưu ({realPoints.length})</span>
          </div>
          {ghostPointsData.length > 0 && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full border-2 border-red-500 border-dashed"></div>
              <span>Điểm tạm thời ({ghostPointsData.length})</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default LjPanel