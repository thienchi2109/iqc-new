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
  t?: number // Numeric timestamp from API
  autoResult?: string
  approvalState?: string
  violations?: string[]
  performerName?: string
  lotCode?: string
  notes?: string
}

export interface QcLimits {
  mean: number | string
  sd: number | string  
  cv?: number | string
}

export interface LjChartProps {
  limits?: QcLimits
  ghostPoints?: GhostPoint[]
  runs?: QcRun[]
  isLoading?: boolean
  title?: string
  className?: string
  height?: number
}

interface ChartDataPoint {
  x: number // Numeric timestamp for proper time axis
  value: number
  z: number | null
  date: string
  formattedDate: string
  type: 'real' | 'ghost'
  autoResult?: 'pass' | 'warn' | 'fail'
  approvalState?: 'pending' | 'approved' | 'rejected'
  color?: string
  runData?: QcRun
  ghostData?: GhostPoint
}

/**
 * Robust Levey-Jennings Chart Component with proper time axis
 * 
 * Key improvements:
 * - Uses numeric timestamps for X-axis instead of indices
 * - Proper Y-domain calculation with ±3SD boundaries
 * - Robust error handling for invalid data
 * - Real-time ghost point integration
 * - Vietnamese date formatting
 * - Performance optimized with React.memo and useMemo
 * - Fixed numeric conversion for PostgreSQL data
 * - Proper color mapping based on auto_result and approval_state
 */
const LjChartComponent = ({
  limits,
  ghostPoints = [],
  runs = [],
  isLoading = false,
  title = 'Biểu đồ Levey-Jennings',
  className = '',
  height = 400,
}: LjChartProps) => {
  // Helper function to ensure numeric values from PostgreSQL
  const toNumber = (value: number | string): number => {
    if (typeof value === 'number') return value
    const parsed = parseFloat(String(value))
    return isNaN(parsed) ? 0 : parsed
  }

  // Convert limits to numbers for calculations
  const numericLimits = React.useMemo(() => {
    if (!limits) return null
    return {
      mean: toNumber(limits.mean),
      sd: toNumber(limits.sd),
      cv: limits.cv ? toNumber(limits.cv) : undefined
    }
  }, [limits])

  // Format date to Vietnamese format
  const formatDate = (date: string | Date): string => {
    const d = typeof date === 'string' ? new Date(date) : date
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      timeZone: 'Asia/Ho_Chi_Minh',
    }).format(d)
  }

  // Get color based on auto_result and approval_state
  const getPointColor = (autoResult?: string, approvalState?: string): string => {
    // Priority: auto_result determines base color
    const baseColor = (() => {
      switch (autoResult) {
        case 'fail': return '#dc2626' // red-600
        case 'warn': return '#ea580c' // orange-600  
        case 'pass': return '#16a34a' // green-600
        default: return '#3b82f6' // blue-600 (default)
      }
    })()
    
    // Approval state affects opacity/style but not base color
    return baseColor
  }

  // Validate limits data with performance optimization
  const hasValidLimits = React.useMemo(() => {
    return numericLimits && 
           Number.isFinite(numericLimits.mean) && 
           Number.isFinite(numericLimits.sd) && 
           numericLimits.sd > 0
  }, [numericLimits]) // Only depend on actual values

  // Prepare chart data by combining real runs and ghost points with proper time sorting
  const chartData = React.useMemo((): ChartDataPoint[] => {
    const data: ChartDataPoint[] = []

    // Add real runs with time validation
    runs.forEach((run) => {
      // Use 't' field from API if available, otherwise parse runAt
      const timestamp = run.t || Date.parse(run.runAt)
      
      // Skip invalid timestamps or values
      if (!Number.isFinite(timestamp) || !Number.isFinite(run.value)) {
        console.warn('Skipping invalid run data:', run)
        return
      }

      data.push({
        x: timestamp,
        value: run.value,
        z: run.z,
        date: run.runAt,
        formattedDate: formatDate(run.runAt),
        type: 'real',
        autoResult: run.autoResult as 'pass' | 'warn' | 'fail' | undefined,
        approvalState: run.approvalState as 'pending' | 'approved' | 'rejected' | undefined,
        color: getPointColor(run.autoResult, run.approvalState),
        runData: run,
      })
    })

    // Add ghost points with validation
    ghostPoints.forEach((ghost) => {
      const timestamp = ghost.time.getTime()
      
      if (!Number.isFinite(timestamp) || !Number.isFinite(ghost.value)) {
        console.warn('Skipping invalid ghost point:', ghost)
        return
      }

      data.push({
        x: timestamp,
        value: ghost.value,
        z: ghost.z,
        date: ghost.time.toISOString(),
        formattedDate: formatDate(ghost.time),
        type: 'ghost',
        color: ghost.color,
        ghostData: ghost,
      })
    })

    // Sort by timestamp for proper line connections
    return data.sort((a, b) => a.x - b.x)
  }, [runs.length, ghostPoints.length, runs, ghostPoints]) // Optimize dependency tracking

  // Calculate Y-domain with ±3SD boundaries and padding
  const yDomain = React.useMemo((): [number, number] => {
    if (!hasValidLimits) {
      // Fallback to data range if no valid limits
      const values = chartData.map(d => d.value).filter(Number.isFinite)
      if (values.length === 0) return [0, 100]
      
      const min = Math.min(...values)
      const max = Math.max(...values)
      const range = max - min || 10
      const padding = range * 0.1
      
      return [min - padding, max + padding]
    }

    // Use ±3SD with padding for line visibility
    const { mean, sd } = numericLimits!
    const lower = mean - 3 * sd
    const upper = mean + 3 * sd
    const range = upper - lower
    const padding = range * 0.05 // 5% padding for reference line visibility
    
    return [lower - padding, upper + padding]
  }, [hasValidLimits, numericLimits, chartData])

  // Calculate X-domain for time axis
  const xDomain = React.useMemo((): [number, number] => {
    if (chartData.length === 0) {
      const now = Date.now()
      return [now - 24 * 60 * 60 * 1000, now] // Last 24 hours default
    }

    const timestamps = chartData.map(d => d.x)
    const min = Math.min(...timestamps)
    const max = Math.max(...timestamps)
    
    // Add 5% padding on each side
    const range = max - min || 24 * 60 * 60 * 1000 // 1 day fallback
    const padding = range * 0.05
    
    return [min - padding, max + padding]
  }, [chartData])

  // Separate real and ghost points for different styling
  const realPoints = chartData.filter(d => d.type === 'real')
  const ghostPointsData = chartData.filter(d => d.type === 'ghost')

  // Custom tooltip component
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null
    
    const data = payload[0].payload
    const isGhost = data.type === 'ghost'
    
    return (
      <div className="bg-white p-3 border border-gray-300 rounded-lg shadow-lg max-w-xs">
        <p className="font-medium text-gray-900">
          Giá trị: {data.value.toFixed(2)}
        </p>
        {data.z !== null && Number.isFinite(data.z) && (
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
            {data.runData.violations && data.runData.violations.length > 0 && (
              <div className="text-sm">
                <span className="font-medium text-red-600">Vi phạm:</span>
                <ul className="list-disc list-inside ml-2">
                  {data.runData.violations.map((violation: string, idx: number) => (
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

  // Loading state
  if (isLoading) {
    return (
      <div className={`bg-white rounded-lg border ${className}`} style={{ height }}>
        <div className="flex items-center justify-center h-full">
          <div className="text-gray-500">Đang tải dữ liệu...</div>
        </div>
      </div>
    )
  }

  // Empty state when no valid limits
  if (!hasValidLimits) {
    return (
      <div className={`bg-white rounded-lg border p-6 ${className}`} style={{ height }}>
        <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
        <div className="flex items-center justify-center h-full">
          <div className="text-center text-gray-500">
            <p className="mb-2">Không có giới hạn QC hợp lệ</p>
            <p className="text-sm">Cần có Mean và SD để hiển thị biểu đồ</p>
          </div>
        </div>
      </div>
    )
  }

  // Empty state when no data
  if (chartData.length === 0) {
    return (
      <div className={`bg-white rounded-lg border p-6 ${className}`} style={{ height }}>
        <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
        <div className="flex items-center justify-center h-full">
          <div className="text-center text-gray-500">
            <p className="mb-2">Chưa có dữ liệu QC</p>
            <p className="text-sm">Nhập các giá trị QC để xem biểu đồ</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-lg border p-6 ${className}`} style={{ height }}>
      <h3 className="text-lg font-medium text-gray-900 mb-4">{title}</h3>
      
      <div style={{ height: height - 100 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            
            <XAxis
              type="number"
              dataKey="x"
              domain={xDomain}
              tickFormatter={(value) => formatDate(new Date(value))}
              stroke="#6b7280"
            />
            
            <YAxis
              type="number"
              domain={yDomain}
              tickFormatter={(value) => value.toFixed(1)}
              stroke="#6b7280"
            />

            <Tooltip content={<CustomTooltip />} />
            
            <Legend />

            {/* Reference lines for statistical limits */}
            {hasValidLimits && (
              <>
                {/* Mean line */}
                <ReferenceLine
                  y={numericLimits!.mean}
                  stroke="#059669"
                  strokeWidth={2}
                  strokeDasharray="none"
                  label={{ value: "Mean", position: "right" }}
                />
                
                {/* ±1SD lines */}
                <ReferenceLine
                  y={numericLimits!.mean + numericLimits!.sd}
                  stroke="#0ea5e9"
                  strokeWidth={1}
                  strokeDasharray="3 3"
                  label={{ value: "+1SD", position: "right" }}
                />
                <ReferenceLine
                  y={numericLimits!.mean - numericLimits!.sd}
                  stroke="#0ea5e9"
                  strokeWidth={1}
                  strokeDasharray="3 3"
                  label={{ value: "-1SD", position: "right" }}
                />
                
                {/* ±2SD lines */}
                <ReferenceLine
                  y={numericLimits!.mean + 2 * numericLimits!.sd}
                  stroke="#f59e0b"
                  strokeWidth={1}
                  strokeDasharray="5 5"
                  label={{ value: "+2SD", position: "right" }}
                />
                <ReferenceLine
                  y={numericLimits!.mean - 2 * numericLimits!.sd}
                  stroke="#f59e0b"
                  strokeWidth={1}
                  strokeDasharray="5 5"
                  label={{ value: "-2SD", position: "right" }}
                />
                
                {/* ±3SD lines */}
                <ReferenceLine
                  y={numericLimits!.mean + 3 * numericLimits!.sd}
                  stroke="#dc2626"
                  strokeWidth={1}
                  strokeDasharray="7 7"
                  label={{ value: "+3SD", position: "right" }}
                />
                <ReferenceLine
                  y={numericLimits!.mean - 3 * numericLimits!.sd}
                  stroke="#dc2626"
                  strokeWidth={1}
                  strokeDasharray="7 7"
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
        
        {hasValidLimits && (
          <div className="mt-2 text-xs text-gray-500">
            Mean: {numericLimits!.mean.toFixed(2)} | SD: {numericLimits!.sd.toFixed(2)} | CV: {numericLimits!.cv?.toFixed(1) || 'N/A'}%
          </div>
        )}
      </div>
    </div>
  )
}

// Performance optimization with React.memo
export const LjChart = React.memo(LjChartComponent, (prevProps, nextProps) => {
  // Custom comparison for optimal re-rendering
  return (
    prevProps.isLoading === nextProps.isLoading &&
    prevProps.title === nextProps.title &&
    prevProps.className === nextProps.className &&
    prevProps.height === nextProps.height &&
    prevProps.runs?.length === nextProps.runs?.length &&
    prevProps.ghostPoints?.length === nextProps.ghostPoints?.length &&
    prevProps.limits?.mean === nextProps.limits?.mean &&
    prevProps.limits?.sd === nextProps.limits?.sd &&
    prevProps.limits?.cv === nextProps.limits?.cv
  )
})

LjChart.displayName = 'LjChart'

export default LjChart
