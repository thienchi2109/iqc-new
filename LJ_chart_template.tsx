"use client"

import { useMemo } from "react"
import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ComposedChart,
  Legend,
} from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { format } from "date-fns"
import { TrendingUp, AlertTriangle, CheckCircle, XCircle } from "lucide-react"

export interface QCDataPoint {
  id: string
  timestamp: string
  value: number
  z: number
  status: "in-control" | "warning" | "reject"
  violations: string[]
  run_id: string
  operator?: string
  comment?: string
}

export interface ControlLimits {
  mean: number
  sd: number
  limit_1s_lower: number
  limit_1s_upper: number
  limit_2s_lower: number
  limit_2s_upper: number
  limit_3s_lower: number
  limit_3s_upper: number
}

interface LeveyJenningsChartProps {
  data: QCDataPoint[]
  limits: ControlLimits | null
  title?: string
  analyte?: string
  level?: string
  instrument?: string
  lot?: string
  height?: number
  showViolations?: boolean
  showTrend?: boolean
}

export function LeveyJenningsChart({
  data,
  limits,
  title,
  analyte,
  level,
  instrument,
  lot,
  height = 400,
  showViolations = true,
  showTrend = false,
}: LeveyJenningsChartProps) {
  const chartData = useMemo(() => {
    return data.map((point, index) => {
      // Safe timestamp formatting
      let formattedDate = "Invalid Date"
      let formattedFullDate = "Invalid Date"

      try {
        if (point.timestamp) {
          const date = new Date(point.timestamp)
          if (!isNaN(date.getTime())) {
            formattedDate = format(date, "MM/dd HH:mm")
            formattedFullDate = format(date, "yyyy-MM-dd HH:mm:ss")
          }
        }
      } catch (error) {
        console.warn("Invalid timestamp format in chart:", point.timestamp, error)
      }

      return {
        ...point,
        index: index + 1,
        date: formattedDate,
        fullDate: formattedFullDate,
        mean: limits?.mean || 0,
      }
    })
  }, [data, limits?.mean])

  const getPointColor = (status: string) => {
    switch (status) {
      case "reject":
        return "#ef4444" // red-500
      case "warning":
        return "#f59e0b" // amber-500
      case "in-control":
        return "#10b981" // emerald-500
      default:
        return "#6b7280" // gray-500
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "reject":
        return <XCircle className="h-4 w-4 text-red-500" />
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case "in-control":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      default:
        return null
    }
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-medium">{`Point ${data.index}`}</p>
          <p className="text-sm text-muted-foreground">{data.fullDate}</p>
          <p className="text-sm">
            <span className="font-medium">Value:</span> {data.value.toFixed(3)}
          </p>
          <p className="text-sm">
            <span className="font-medium">Z-Score:</span> {data.z.toFixed(3)}
          </p>
          <p className="text-sm">
            <span className="font-medium">Run:</span> {data.run_id}
          </p>
          <div className="flex items-center gap-1 mt-1">
            {getStatusIcon(data.status)}
            <span className="text-sm capitalize">{data.status}</span>
          </div>
          {data.violations && Array.isArray(data.violations) && data.violations.length > 0 && (
            <div className="mt-2">
              <p className="text-xs font-medium text-red-600">Violations:</p>
              {data.violations.map((violation: string, index: number) => (
                <Badge key={`violation-${violation}-${index}`} variant="destructive" className="text-xs mr-1">
                  {violation}
                </Badge>
              ))}
            </div>
          )}
          {data.comment && (
            <p className="text-xs text-muted-foreground mt-1">
              <span className="font-medium">Note:</span> {data.comment}
            </p>
          )}
        </div>
      )
    }
    return null
  }

  const CustomDot = (props: any) => {
    const { cx, cy, payload } = props
    if (!showViolations) return null

    const color = getPointColor(payload.status)
    const size = payload.status === "reject" ? 8 : payload.status === "warning" ? 6 : 4

    return <circle cx={cx} cy={cy} r={size} fill={color} stroke="white" strokeWidth={1} />
  }

  const violationCount = data.filter((d) => d.status === "reject").length
  const warningCount = data.filter((d) => d.status === "warning").length
  const inControlCount = data.filter((d) => d.status === "in-control").length

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title || "Levey-Jennings Chart"}</CardTitle>
          {(analyte || level || instrument || lot) && (
            <CardDescription>{[analyte, level, instrument, lot].filter(Boolean).join(" • ")}</CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>No data available for the selected criteria.</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              {title || "Levey-Jennings Chart"}
            </CardTitle>
            {(analyte || level || instrument || lot) && (
              <CardDescription>{[analyte, level, instrument, lot].filter(Boolean).join(" • ")}</CardDescription>
            )}
          </div>
          <div className="flex gap-2">
            <Badge className="bg-green-100 text-green-800 border-green-200">
              <CheckCircle className="h-3 w-3 mr-1" />
              {inControlCount} In-Control
            </Badge>
            {warningCount > 0 && (
              <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {warningCount} Warning
              </Badge>
            )}
            {violationCount > 0 && (
              <Badge variant="destructive">
                <XCircle className="h-3 w-3 mr-1" />
                {violationCount} Violations
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Control Limits Info */}
          {limits ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Mean:</span>
                <span className="ml-2 font-mono">{limits.mean.toFixed(3)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">SD:</span>
                <span className="ml-2 font-mono">{limits.sd.toFixed(3)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">±2SD:</span>
                <span className="ml-2 font-mono">
                  {limits.limit_2s_lower.toFixed(1)} - {limits.limit_2s_upper.toFixed(1)}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">±3SD:</span>
                <span className="ml-2 font-mono">
                  {limits.limit_3s_lower.toFixed(1)} - {limits.limit_3s_upper.toFixed(1)}
                </span>
              </div>
            </div>
          ) : (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Chưa có giới hạn kiểm soát cho tổ hợp này. Biểu đồ hiển thị dữ liệu mà không có đường giới hạn.
              </AlertDescription>
            </Alert>
          )}

          {/* Chart */}
          <ResponsiveContainer width="100%" height={height}>
            <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="index"
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `${value}`}
                label={{ value: "Data Point", position: "insideBottom", offset: -5 }}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                domain={["dataMin - 0.5", "dataMax + 0.5"]}
                label={{ value: "Value", angle: -90, position: "insideLeft" }}
              />

              {/* Control Limits */}
              {limits && (
                <>
                  <ReferenceLine y={limits.mean} stroke="#2563eb" strokeWidth={2} strokeDasharray="5 5" />
                  <ReferenceLine y={limits.limit_1s_upper} stroke="#10b981" strokeWidth={1} strokeDasharray="3 3" />
                  <ReferenceLine y={limits.limit_1s_lower} stroke="#10b981" strokeWidth={1} strokeDasharray="3 3" />
                  <ReferenceLine y={limits.limit_2s_upper} stroke="#f59e0b" strokeWidth={1} strokeDasharray="3 3" />
                  <ReferenceLine y={limits.limit_2s_lower} stroke="#f59e0b" strokeWidth={1} strokeDasharray="3 3" />
                  <ReferenceLine y={limits.limit_3s_upper} stroke="#ef4444" strokeWidth={1} strokeDasharray="3 3" />
                  <ReferenceLine y={limits.limit_3s_lower} stroke="#ef4444" strokeWidth={1} strokeDasharray="3 3" />
                </>
              )}

              {/* Data Line */}
              <Line
                type="monotone"
                dataKey="value"
                stroke="#6366f1"
                strokeWidth={2}
                dot={showViolations ? <CustomDot /> : { fill: "#6366f1", strokeWidth: 1, r: 3 }}
                connectNulls={false}
              />

              {/* Trend Line */}
              {showTrend && (
                <Line
                  type="linear"
                  dataKey="value"
                  stroke="#8b5cf6"
                  strokeWidth={1}
                  strokeDasharray="5 5"
                  dot={false}
                  connectNulls={false}
                />
              )}

              <Tooltip content={<CustomTooltip />} />
              <Legend
                content={() => (
                  <div className="flex justify-center gap-4 mt-4 text-xs">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-0.5 bg-blue-600"></div>
                      <span>Mean</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-0.5 bg-green-500"></div>
                      <span>±1SD</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-0.5 bg-yellow-500"></div>
                      <span>±2SD</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-0.5 bg-red-500"></div>
                      <span>±3SD</span>
                    </div>
                  </div>
                )}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
