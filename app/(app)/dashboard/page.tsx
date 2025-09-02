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
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Internal Quality Control Management Overview
          </p>
        </div>
        <div className="flex space-x-3">
          <Button asChild>
            <Link href="/quick-entry">Quick Entry</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/lj-chart">View Charts</Link>
          </Button>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatusCard
          title="Accepted Runs"
          count={stats?.accepted || 0}
          color="green"
          icon="✓"
        />
        <StatusCard
          title="Warnings"
          count={stats?.warnings || 0}
          color="yellow"
          icon="⚠"
        />
        <StatusCard
          title="Rejected Runs"
          count={stats?.rejected || 0}
          color="red"
          icon="✗"
        />
        <StatusCard
          title="Total Runs"
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
              Recent QC Runs
            </h2>
            <Button variant="outline" size="sm" asChild>
              <Link href="/lj-chart">View All</Link>
            </Button>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date/Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Device
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Test
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Level
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Value
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Z-Score
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {runsLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    Loading recent runs...
                  </td>
                </tr>
              ) : recentRuns?.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    No QC runs found. 
                    <Link href="/quick-entry" className="text-blue-600 hover:underline ml-1">
                      Create your first run
                    </Link>
                  </td>
                </tr>
              ) : (
                recentRuns?.map((run) => (
                  <tr key={run.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(run.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {run.deviceId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {run.testId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {run.levelId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {run.value}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {run.z?.toFixed(2) || 'N/A'}
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
                        {run.status}
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
            Quick Entry
          </h3>
          <p className="text-gray-600 text-sm mb-4">
            Enter QC data for up to 3 levels in one session
          </p>
          <Button asChild className="w-full">
            <Link href="/quick-entry">Start Entry</Link>
          </Button>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            Levey-Jennings Charts
          </h3>
          <p className="text-gray-600 text-sm mb-4">
            View L-J charts with Westgard rule violations
          </p>
          <Button asChild variant="outline" className="w-full">
            <Link href="/lj-chart">View Charts</Link>
          </Button>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            Reports
          </h3>
          <p className="text-gray-600 text-sm mb-4">
            Generate summary reports and export data
          </p>
          <Button asChild variant="outline" className="w-full">
            <Link href="/reports">View Reports</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}