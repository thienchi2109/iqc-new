"use client"

import React from "react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  DotProps,
} from "recharts"
import { format } from "date-fns"

// --- Type Definitions ---

export interface QcRun {
  id: string
  createdAt: string | Date
  created_at?: string | Date // Keep for backward compatibility
  value: number
  z?: number
  z_score?: number // Keep for backward compatibility  
  autoResult?: "pass" | "warn" | "fail"
  auto_result?: "pass" | "warn" | "fail" // Keep for backward compatibility
  approvalState?: "pending" | "approved" | "rejected"
  approval_state?: "pending" | "approved" | "rejected" // Keep for backward compatibility
  performerName?: string
  performer_name?: string // Keep for backward compatibility
  lotCode?: string
  lot_code?: string // Keep for backward compatibility
  violations?: { rule_code: string }[]
}

export interface QcLimits {
  mean: number
  sd: number
}

interface ChartPoint {
  x: number // Timestamp
  y: number // QC value
  run: QcRun
}

interface LeveyJenningsChartProps {
  runs: QcRun[]
  limits?: QcLimits
  title?: string
  className?: string
  height?: number
}

// --- Helper Functions ---

const formatDateTick = (tickItem: number) => {
  return format(new Date(tickItem), "dd/MM")
}

// Get point color based on auto_result status
const getPointColor = (autoResult?: string): string => {
  switch (autoResult) {
    case 'fail': return '#dc2626' // red-600
    case 'warn': return '#ea580c' // orange-600  
    case 'pass': return '#16a34a' // green-600
    default: return '#3b82f6' // blue-600 (default)
  }
}

// Custom dot component that renders different colors based on auto_result
const CustomDot = (props: DotProps & { payload?: any }) => {
  const { cx, cy, payload } = props
  
  if (!payload || !payload.run) {
    return (
      <circle
        cx={cx}
        cy={cy}
        r={4}
        fill="#3b82f6"
        stroke="#3b82f6"
        strokeWidth={2}
        opacity={0.8}
      />
    );
  }
  
  // Handle both camelCase (from API) and snake_case (legacy) field names
  const autoResult = payload.run.autoResult || payload.run.auto_result;
  const color = getPointColor(autoResult);
  
  return (
    <circle
      cx={cx}
      cy={cy}
      r={4}
      fill={color}
      stroke={color}
      strokeWidth={2}
      opacity={0.8}
    />
  )
}

const CustomTooltipContent = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    const { run } = data

    return (
      <div className="max-w-xs rounded-xl border border-gray-200 bg-white p-3 text-sm shadow-lg">
        <p className="mb-1 font-bold">
          Giá trị: <span className="font-mono">{run.value.toFixed(2)}</span>
        </p>
        <p className="text-gray-600">
          Ngày: {(() => {
            try {
              // Debug: log the actual data structure
              console.log("Tooltip data:", data);
              console.log("Run object:", run);
              console.log("Created at value:", run.created_at);
              console.log("Type of created_at:", typeof run.created_at);
              
              // Try multiple date formats and sources
              let dateValue = run.created_at || run.createdAt || run.runAt || run.run_at_utc;
              
              if (dateValue) {
                let date;
                // Handle different date formats
                if (typeof dateValue === 'string') {
                  date = new Date(dateValue);
                } else if (typeof dateValue === 'number') {
                  date = new Date(dateValue);
                } else if (dateValue instanceof Date) {
                  date = dateValue;
                } else {
                  date = new Date(dateValue.toString());
                }
                
                if (!isNaN(date.getTime())) {
                  return format(date, "dd/MM/yyyy HH:mm");
                }
              }
              return "No date available";
            } catch (error) {
              console.warn("Tooltip date error:", error);
              console.log("Error data:", data);
              return "Date format error";
            }
          })()}
        </p>
        {(run.z || run.z_score) && (
          <p className="text-gray-600">
            Z-score: {(run.z || run.z_score)?.toFixed(2)}
          </p>
        )}
        <div className="mt-2 space-y-1">
          {run.violations && run.violations.length > 0 && (
            <div className="flex items-center">
              <span className="mr-2 text-red-500">●</span>
              <span>Vi phạm: {run.violations.map((v: any) => v.rule_code).join(", ")}</span>
            </div>
          )}
          <div className="flex items-center">
            <span
              className={`mr-2 ${
                (run.autoResult || run.auto_result) === "fail"
                  ? "text-red-500"
                  : (run.autoResult || run.auto_result) === "warn"
                  ? "text-orange-500"
                  : "text-green-500"
              }`}
            >
              ●
            </span>
            <span>
              Tự động:{" "}
              {(run.autoResult || run.auto_result) === "pass"
                ? "Đạt"
                : (run.autoResult || run.auto_result) === "warn"
                ? "Cảnh báo"
                : "Vi phạm"}
            </span>
          </div>
          <div className="flex items-center">
            <span
              className={`mr-2 ${
                (run.approvalState || run.approval_state) === "approved"
                  ? "text-green-600"
                  : (run.approvalState || run.approval_state) === "rejected"
                  ? "text-red-600"
                  : "text-gray-500"
              }`}
            >
              ●
            </span>
            <span>
              Trạng thái:{" "}
              {(run.approvalState || run.approval_state) === "approved"
                ? "Đã duyệt"
                : (run.approvalState || run.approval_state) === "rejected"
                ? "Bị loại"
                : "Chờ duyệt"}
            </span>
          </div>
        </div>
        {(run.performerName || run.performer_name) && (
          <p className="mt-2 border-t pt-2 text-gray-500">
            Người thực hiện: {run.performerName || run.performer_name}
          </p>
        )}
      </div>
    )
  }

  return null
}

// --- Main Chart Component ---

export const LeveyJenningsChart: React.FC<LeveyJenningsChartProps> = ({
  runs,
  limits,
  title = "",
  className = "",
  height = 400,
}) => {
  const chartData = React.useMemo(() => {
    return runs.map((run, index) => {
      // Safe date parsing and formatting
      let formattedDate = "Invalid Date";
      let timestamp = 0;
      
      try {
        const dateValue = run.createdAt || run.created_at;
        if (dateValue) {
          const date = new Date(dateValue);
          if (!isNaN(date.getTime())) {
            timestamp = date.getTime();
            formattedDate = format(date, "dd/MM HH:mm");
          }
        }
      } catch (error) {
        console.warn("Invalid date format in chart:", run.created_at, error);
      }

      return {
        index: index + 1,
        x: timestamp,
        value: run.value,
        result: run.value, // Keep for backward compatibility
        run,
        date: formattedDate,
      };
    }).sort((a, b) => a.x - b.x)
  }, [runs])

  const yDomain: [number, number] | undefined = React.useMemo(() => {
    if (!limits) return undefined
    const { mean, sd } = limits
    const lowerBound = mean - 4 * sd
    const upperBound = mean + 4 * sd
    return [lowerBound, upperBound]
  }, [limits])

  if (!limits || typeof limits.mean !== "number" || typeof limits.sd !== "number") {
    return (
      <div
        className={`flex items-center justify-center rounded-lg border bg-gray-50 ${className}`}
        style={{ height }}
      >
        <div className="text-center text-gray-500">
          <p>Chưa chọn đủ thông tin để hiển thị biểu đồ.</p>
          <p className="text-sm">Vui lòng chọn Máy, Xét nghiệm, Mức QC và Lô QC.</p>
        </div>
      </div>
    );
  }

  const { mean, sd } = limits

  return (
    <div className={`rounded-xl border bg-white p-4 shadow-md ${className}`}>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart
          data={chartData}
          margin={{ top: 20, right: 80, left: 20, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          <XAxis
            dataKey="index"
            type="number"
            domain={["dataMin", "dataMax"]}
            tickFormatter={(value) => `${value}`}
            tick={{ fontSize: 12 }}
            padding={{ left: 20, right: 20 }}
          />
          <YAxis
            domain={yDomain}
            tick={{ fontSize: 12 }}
            width={50}
            allowDataOverflow
          />
          <Tooltip content={<CustomTooltipContent />} />
          <Legend
            verticalAlign="top"
            height={36}
            formatter={(value) => <span className="text-gray-700">{value}</span>}
          />

          {/* Reference Lines for SD */}
          <ReferenceLine y={mean} label={{ value: "Mean", position: "right", offset: 10, fill: "#4b5563" }} stroke="#4b5563" strokeWidth={1.5} />
          <ReferenceLine y={mean + sd} label={{ value: "+1SD", position: "right", offset: 10, fill: "#6b7280" }} stroke="#a1a1aa" strokeDasharray="3 3" />
          <ReferenceLine y={mean - sd} label={{ value: "-1SD", position: "right", offset: 10, fill: "#6b7280" }} stroke="#a1a1aa" strokeDasharray="3 3" />
          <ReferenceLine y={mean + 2 * sd} label={{ value: "+2SD", position: "right", offset: 10, fill: "#f97316" }} stroke="#f97316" strokeDasharray="3 3" />
          <ReferenceLine y={mean - 2 * sd} label={{ value: "-2SD", position: "right", offset: 10, fill: "#f97316" }} stroke="#f97316" strokeDasharray="3 3" />
          <ReferenceLine y={mean + 3 * sd} label={{ value: "+3SD", position: "right", offset: 10, fill: "#ef4444" }} stroke="#ef4444" strokeDasharray="3 3" />
          <ReferenceLine y={mean - 3 * sd} label={{ value: "-3SD", position: "right", offset: 10, fill: "#ef4444" }} stroke="#ef4444" strokeDasharray="3 3" />

          <Line
            type="monotone"
            dataKey="value"
            name="Giá trị QC"
            stroke="#6b7280"
            strokeOpacity={0.5}
            strokeWidth={2}
            dot={<CustomDot />}
            activeDot={{ r: 8 }}
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
      
      {/* Color Legend for Auto Result Status */}
      <div className="mt-4 flex flex-wrap gap-4 text-xs text-gray-600 border-t pt-3">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-green-600"></div>
          <span>Đạt (Pass)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-orange-600"></div>
          <span>Cảnh báo (Warn)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-red-600"></div>
          <span>Vi phạm (Fail)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-blue-600"></div>
          <span>Chưa xác định</span>
        </div>
      </div>
    </div>
  )
}
