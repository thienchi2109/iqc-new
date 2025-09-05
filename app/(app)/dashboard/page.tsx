'use client'

import { useQuery } from '@tanstack/react-query'
import StatusCard from '@/components/StatusCard'
import { Button } from '@/components/ui/Button'
import Link from 'next/link'

interface QcRun {
  id: string
  deviceId: string
  testId: string
  levelId: string
  value: number
  status: 'pending' | 'accepted' | 'rejected'
  z: number
  createdAt: string
  // New joined fields
  deviceCode: string
  deviceName: string
  testCode: string
  testName: string
  level: string
  levelMaterial?: string
  lotCode: string
  unitDisplay?: string
  methodName?: string
  performerName?: string
}

async function fetchRecentRuns(): Promise<QcRun[]> {
  const response = await fetch('/api/qc/runs?limit=10')
  if (!response.ok) {
    throw new Error('Failed to fetch runs')
  }
  return response.json()
}

async function fetchRunStats() {
  const response = await fetch('/api/qc/runs?limit=1000')
  if (!response.ok) {
    throw new Error('Failed to fetch run statistics')
  }
  const runs: QcRun[] = await response.json()
  
  return {
    accepted: runs.filter(r => r.status === 'accepted').length,
    warnings: runs.filter(r => r.status === 'pending').length,
    rejected: runs.filter(r => r.status === 'rejected').length,
    total: runs.length,
  }
}

export default function Dashboard() {
  const { data: recentRuns, isLoading: runsLoading } = useQuery({
    queryKey: ['recent-runs'],
    queryFn: fetchRecentRuns,
  })

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['run-stats'],
    queryFn: fetchRunStats,
  })

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Bảng điều khiển</h1>
          <p className="text-gray-600 mt-1">
            Tổng quan quản lý nội kiểm chất lượng
          </p>
        </div>
        <div className="flex space-x-3">
          <Button asChild>
            <Link href="/quick-entry">Nhập nhanh</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/lj-chart">Xem biểu đồ</Link>
          </Button>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatusCard
          title="Lần chạy được chấp nhận"
          count={stats?.accepted || 0}
          color="green"
          icon="✓"
        />
        <StatusCard
          title="Cảnh báo"
          count={stats?.warnings || 0}
          color="yellow"
          icon="⚠"
        />
        <StatusCard
          title="Lần chạy bị từ chối"
          count={stats?.rejected || 0}
          color="red"
          icon="✗"
        />
        <StatusCard
          title="Tổng số lần chạy"
          count={stats?.total || 0}
          color="blue"
          icon="📊"
        />
      </div>

      {/* Recent QC Runs */}
      <div className="bg-white rounded-2xl shadow-md border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">
              Lần chạy QC gần đây
            </h2>
            <Button variant="outline" size="sm" asChild>
              <Link href="/lj-chart">Xem tất cả</Link>
            </Button>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ngày/Giờ
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Thiết bị
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Xét nghiệm
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Mức
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Giá trị
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Z-Score
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Trạng thái
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {runsLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    Đang tải các lần chạy gần đây...
                  </td>
                </tr>
              ) : recentRuns?.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    Không tìm thấy lần chạy QC nào.
                    <Link href="/quick-entry" className="text-blue-600 hover:underline ml-1">
                      Tạo lần chạy đầu tiên của bạn
                    </Link>
                  </td>
                </tr>
              ) : (
                recentRuns?.map((run) => (
                  <tr key={run.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(run.createdAt).toLocaleDateString('vi-VN', {
                        day: '2-digit',
                        month: '2-digit', 
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        timeZone: 'Asia/Ho_Chi_Minh'
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>
                        <div className="font-medium">{run.deviceCode}</div>
                        <div className="text-xs text-gray-500">{run.deviceName}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>
                        <div className="font-medium">{run.testCode}</div>
                        <div className="text-xs text-gray-500">{run.testName}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>
                        <div className="font-medium">{run.level}</div>
                        {run.levelMaterial && (
                          <div className="text-xs text-gray-500">{run.levelMaterial}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>
                        <div className="font-medium">{run.value}</div>
                        {run.unitDisplay && (
                          <div className="text-xs text-gray-500">{run.unitDisplay}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {run.z != null && !isNaN(Number(run.z)) ? Number(run.z).toFixed(2) : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          run.status === 'accepted'
                            ? 'bg-green-100 text-green-800'
                            : run.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {run.status === 'accepted' ? 'Chấp nhận' : 
                         run.status === 'pending' ? 'Chờ duyệt' : 'Từ chối'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            Nhập nhanh
          </h3>
          <p className="text-gray-600 text-sm mb-4">
            Nhập dữ liệu QC cho tối đa 3 mức trong một phiên
          </p>
          <Button asChild className="w-full">
            <Link href="/quick-entry">Bắt đầu nhập</Link>
          </Button>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            Biểu đồ Levey-Jennings
          </h3>
          <p className="text-gray-600 text-sm mb-4">
            Xem biểu đồ L-J với các vi phạm quy tắc Westgard
          </p>
          <Button asChild variant="outline" className="w-full">
            <Link href="/lj-chart">Xem biểu đồ</Link>
          </Button>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            Báo cáo
          </h3>
          <p className="text-gray-600 text-sm mb-4">
            Tạo báo cáo tóm tắt và xuất dữ liệu
          </p>
          <Button asChild variant="outline" className="w-full">
            <Link href="/reports">Xem báo cáo</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}