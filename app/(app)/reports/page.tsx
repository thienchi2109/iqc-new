'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Input } from '@/components/ui/Input'
import CustomSelect from '@/components/ui/CustomSelect'
import { Button } from '@/components/ui/Button'

interface ReportData {
  device: string
  test: string
  level: string
  totalRuns: number
  acceptedRuns: number
  warningRuns: number
  rejectedRuns: number
  acceptanceRate: number
  rejectionRate: number
}

export default function Reports() {
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [deviceId, setDeviceId] = useState('')
  const [testId, setTestId] = useState('')
  const [groupBy, setGroupBy] = useState('month')

  // Fetch master data
  const { data: devices } = useQuery({
    queryKey: ['devices'],
    queryFn: () => fetch('/api/devices').then(res => res.json()),
  })

  const { data: tests } = useQuery({
    queryKey: ['tests'],
    queryFn: () => fetch('/api/tests').then(res => res.json()),
  })

  // Mock report data - in real implementation, this would come from the API
  const { data: reportData, isLoading } = useQuery<ReportData[]>({
    queryKey: ['report-summary', dateFrom, dateTo, deviceId, testId, groupBy],
    queryFn: async () => {
      return [
        {
          device: 'AU5800',
          test: 'Glucose',
          level: 'L1',
          totalRuns: 120,
          acceptedRuns: 110,
          warningRuns: 8,
          rejectedRuns: 2,
          acceptanceRate: 91.7,
          rejectionRate: 1.7,
        },
        {
          device: 'AU5800',
          test: 'Glucose',
          level: 'L2',
          totalRuns: 118,
          acceptedRuns: 105,
          warningRuns: 10,
          rejectedRuns: 3,
          acceptanceRate: 89.0,
          rejectionRate: 2.5,
        },
        {
          device: 'AU5800',
          test: 'ALT',
          level: 'L1',
          totalRuns: 115,
          acceptedRuns: 108,
          warningRuns: 5,
          rejectedRuns: 2,
          acceptanceRate: 93.9,
          rejectionRate: 1.7,
        },
      ]
    },
    enabled: true,
  })

  const handleExport = async () => {
    try {
      const params = new URLSearchParams()
      if (dateFrom) params.append('from', dateFrom)
      if (dateTo) params.append('to', dateTo)
      if (deviceId) params.append('deviceId', deviceId)
      if (testId) params.append('testId', testId)
      params.append('groupBy', groupBy)

      // Mock Excel export - in real implementation, this would download a file
      alert('Chức năng xuất Excel sẽ được triển khai tại đây')
    } catch (error) {
      console.error('Xuất thất bại:', error)
      alert('Xuất thất bại. Vui lòng thử lại.')
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Báo cáo</h1>
        <p className="text-gray-600 mt-1">Báo cáo tóm tắt và thống kê vi phạm</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Bộ lọc báo cáo</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Thiết bị</label>
            <CustomSelect
              value={deviceId}
              onChange={(value) => setDeviceId(value)}
              options={devices?.map((device: any) => ({ value: device.id, label: `${device.code} - ${device.name}` })) || []}
              placeholder="Tất cả thiết bị"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Xét nghiệm</label>
            <CustomSelect
              value={testId}
              onChange={(value) => setTestId(value)}
              options={tests?.map((test: any) => ({ value: test.id, label: `${test.code} - ${test.name}` })) || []}
              placeholder="Tất cả xét nghiệm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nhóm theo</label>
            <CustomSelect
              value={groupBy}
              onChange={(value) => setGroupBy(value)}
              options={[
                { value: 'device', label: 'Thiết bị' },
                { value: 'test', label: 'Xét nghiệm' },
                { value: 'month', label: 'Tháng' },
                { value: 'week', label: 'Tuần' },
              ]}
            />
          </div>
        </div>

        <div className="mt-4 flex justify-end space-x-3">
          <Button variant="outline" onClick={handleExport}>Xuất Excel</Button>
          <Button>Tạo báo cáo</Button>
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Tổng số lần chạy</h3>
          <p className="text-3xl font-bold text-blue-600">
            {reportData?.reduce((sum, item) => sum + item.totalRuns, 0) || 0}
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Tỷ lệ chấp nhận</h3>
          <p className="text-3xl font-bold text-green-600">
            {reportData && reportData.length > 0 
              ? (reportData.reduce((sum, item) => sum + item.acceptanceRate, 0) / reportData.length).toFixed(1)
              : 0
            }%
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Tỷ lệ cảnh báo</h3>
          <p className="text-3xl font-bold text-yellow-600">
            {reportData && reportData.length > 0 
              ? (reportData.reduce((sum, item) => sum + (item.warningRuns / item.totalRuns * 100), 0) / reportData.length).toFixed(1)
              : 0
            }%
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Tỷ lệ từ chối</h3>
          <p className="text-3xl font-bold text-red-600">
            {reportData && reportData.length > 0 
              ? (reportData.reduce((sum, item) => sum + item.rejectionRate, 0) / reportData.length).toFixed(1)
              : 0
            }%
          </p>
        </div>
      </div>

      {/* Detailed Report Table */}
      <div className="bg-white rounded-2xl shadow-md border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Tóm tắt hiệu suất QC</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Thiết bị</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Xét nghiệm</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mức</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tổng số lần chạy</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Chấp nhận</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cảnh báo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Từ chối</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tỷ lệ chấp nhận</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tỷ lệ từ chối</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-gray-500">Đang tải dữ liệu báo cáo...</td>
                </tr>
              ) : reportData?.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-gray-500">Không có dữ liệu cho các tiêu chí đã chọn</td>
                </tr>
              ) : (
                reportData?.map((row, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{row.device}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.test}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.level}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.totalRuns}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">{row.acceptedRuns}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-yellow-600">{row.warningRuns}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">{row.rejectedRuns}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.acceptanceRate.toFixed(1)}%</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.rejectionRate.toFixed(1)}%</td>
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

