"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import CustomSelect from "@/components/ui/CustomSelect"
import { Button } from "@/components/ui/button"

type Summary = {
  totalRuns: number
  acceptedRuns: number
  rejectedRuns: number
  warningRuns: number
  acceptanceRate: number
  rejectionRate: number
}

type RunRow = {
  id: string
  at: string
  value: number
  z: number | null
  status: "pending" | "accepted" | "rejected"
  autoResult: "pass" | "warn" | "fail" | null
  deviceName?: string
  testName?: string
  level?: string
  lotCode?: string
}

export default function Reports() {
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [deviceId, setDeviceId] = useState("")
  const [testId, setTestId] = useState("")

  // Master data
  const { data: devices } = useQuery({
    queryKey: ["devices"],
    queryFn: () => fetch("/api/devices").then((res) => res.json()),
  })

  const { data: tests } = useQuery({
    queryKey: ["tests"],
    queryFn: () => fetch("/api/tests").then((res) => res.json()),
  })

  // Summary from API
  const { data: summary } = useQuery<Summary>({
    queryKey: ["reports-summary", dateFrom, dateTo, deviceId, testId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (dateFrom) params.append("from", dateFrom)
      if (dateTo) params.append("to", dateTo)
      if (deviceId) params.append("deviceId", deviceId)
      if (testId) params.append("testId", testId)
      const res = await fetch(`/api/reports/summary?${params.toString()}`)
      if (!res.ok) throw new Error("Failed to load summary")
      return res.json()
    },
  })

  // Runs page (for table preview)
  const { data: runsPage, isLoading: runsLoading } = useQuery<{ data: RunRow[]; meta: any }>({
    queryKey: ["reports-runs", dateFrom, dateTo, deviceId, testId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (dateFrom) params.append("from", dateFrom)
      if (dateTo) params.append("to", dateTo)
      if (deviceId) params.append("deviceId", deviceId)
      if (testId) params.append("testId", testId)
      params.append("page", "1")
      params.append("pageSize", "25")
      const res = await fetch(`/api/reports/runs?${params.toString()}`)
      if (!res.ok) throw new Error("Failed to load runs")
      return res.json()
    },
  })

  const handleExport = async () => {
    try {
      const params = new URLSearchParams()
      if (dateFrom) params.append("from", dateFrom)
      if (dateTo) params.append("to", dateTo)
      if (deviceId) params.append("deviceId", deviceId)
      if (testId) params.append("testId", testId)
      params.append("page", "1")
      params.append("pageSize", "500")
      params.append("format", "csv")

      const res = await fetch(`/api/reports/runs?${params.toString()}`)
      if (!res.ok) throw new Error("Export failed")
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "qc_runs.csv"
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
      toast.success("Xuất CSV thành công")
    } catch (error) {
      console.error("Xuất thất bại:", error)
      toast.error("Xuất thất bại. Vui lòng thử lại.")
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="print:hidden">
        <h1 className="text-3xl font-bold text-gray-900">Báo cáo</h1>
        <p className="text-gray-600 mt-1">Tổng hợp & thống kê QC phục vụ Audit</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-6 print:hidden">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Bộ lọc báo cáo</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Từ ngày</label>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Đến ngày</label>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Thiết bị</label>
            <CustomSelect
              value={deviceId}
              onChange={(value) => setDeviceId(value)}
              options={devices?.map((d: any) => ({ value: d.id, label: `${d.code} - ${d.name}` })) || []}
              placeholder="Tất cả thiết bị"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Xét nghiệm</label>
            <CustomSelect
              value={testId}
              onChange={(value) => setTestId(value)}
              options={tests?.map((t: any) => ({ value: t.id, label: `${t.code} - ${t.name}` })) || []}
              placeholder="Tất cả xét nghiệm"
            />
          </div>
        </div>

        <div className="mt-4 flex justify-end space-x-3">
          <Button variant="outline" onClick={handleExport}>
            Xuất CSV
          </Button>
          <Button onClick={() => window.print()}>In PDF</Button>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Tổng số lần chạy</h3>
          <p className="text-3xl font-bold text-blue-600">{summary?.totalRuns ?? 0}</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Tỷ lệ chấp nhận</h3>
          <p className="text-3xl font-bold text-green-600">{summary ? Number(summary.acceptanceRate).toFixed(1) : 0}%</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Tỷ lệ cảnh báo</h3>
          <p className="text-3xl font-bold text-yellow-600">
            {summary?.totalRuns ? ((summary.warningRuns / summary.totalRuns) * 100).toFixed(1) : 0}%
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Tỷ lệ từ chối</h3>
          <p className="text-3xl font-bold text-red-600">{summary ? Number(summary.rejectionRate).toFixed(1) : 0}%</p>
        </div>
      </div>

      {/* Runs table (preview) */}
      <div className="bg-white rounded-2xl shadow-md border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Bảng dữ liệu QC (trích 25 dòng)</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Thời gian</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Thiết bị</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Xét nghiệm</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mức</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lô</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Giá trị</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Z</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {runsLoading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">Đang tải dữ liệu...</td>
                </tr>
              ) : !runsPage || runsPage.data.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">Không có dữ liệu phù hợp</td>
                </tr>
              ) : (
                runsPage.data.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{new Date(r.at).toLocaleString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{r.deviceName ?? ""}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{r.testName ?? ""}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{r.level ?? ""}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{r.lotCode ?? ""}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{r.value}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{r.z ?? ""}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{r.status}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

